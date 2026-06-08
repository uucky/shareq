import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import { createShareQServer } from '../../src/app.js';

const expectedRoomIdPattern = /[A-Z0-9]{5}/;

const silentLogger = {
  log() {},
  error() {}
};

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function createTestServer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shareq-e2e-'));
  const shareq = createShareQServer({
    databaseFile: path.join(tmpDir, 'shareq.sqlite'),
    enableRequestLog: false,
    logger: silentLogger,
    saveIntervalMs: 0
  });
  const port = await listen(shareq.httpServer);

  return {
    origin: `http://127.0.0.1:${port}`,
    shareq,
    tmpDir
  };
}

async function closeTestServer({ shareq, tmpDir }) {
  await shareq.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function createRunId() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function createUserId(offset) {
  return `00000000-0000-4000-8000-${String(offset).padStart(12, '0')}`;
}

function contextOptionsForProject(projectUse) {
  const contextKeys = ['viewport', 'deviceScaleFactor', 'isMobile', 'hasTouch', 'userAgent'];
  const options = {};

  for (const key of contextKeys) {
    if (projectUse[key] !== undefined) {
      options[key] = projectUse[key];
    }
  }

  return options;
}

function seedUserStorage({ userId }) {
  globalThis.localStorage.setItem('shareq_userid', userId);
  globalThis.localStorage.setItem('shareq_avatar', '🎤');
  globalThis.localStorage.removeItem('shareq_last_room');
  globalThis.localStorage.removeItem('shareq_username');
  globalThis.localStorage.removeItem('shareq_theme');
  globalThis.localStorage.removeItem('shareq_compact_mode');
}

async function openSeededPage(page, { origin, userId }) {
  await page.addInitScript(seedUserStorage, { userId });
  await page.goto(origin);
}

async function createAdditionalUserPage(browser, testInfo, { userId }) {
  const context = await browser.newContext(contextOptionsForProject(testInfo.project.use));
  await context.addInitScript(seedUserStorage, { userId });

  return {
    context,
    page: await context.newPage()
  };
}

async function closeContexts(contexts) {
  for (const context of contexts) {
    try {
      await context.close();
    } catch (error) {
      if (!String(error.message).includes('Target page, context or browser has been closed')) {
        throw error;
      }
    }
  }
}

function watchPageProblems(page) {
  const problems = [];

  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return;
    }

    const text = message.text();
    if (text.includes('Failed to load resource') || text.includes('net::ERR')) {
      return;
    }

    problems.push(`console: ${text}`);
  });

  return problems;
}

async function enterUser(page, { username }) {
  await page.locator('#setup-username').fill(username);
}

async function createRoom(page) {
  await page.locator('.tab-btn[data-tab="create"]').click();
  await page.locator('#create-room-btn').click();
  await expect(page.locator('#room-view')).toBeVisible();
  await expect(page.locator('#display-room-id')).toHaveText(expectedRoomIdPattern);

  return (await page.locator('#display-room-id').textContent()).trim();
}

async function submitSong(page, { title, singer }) {
  await page.locator('#song-title').fill(title);
  await page.locator('#song-singer').fill(singer);
  await page.locator('#confirm-request-btn').click();
}

async function requestFirstSong(page, { title, singer }) {
  await submitSong(page, { title, singer });
  await expect(page.locator('#playing-title')).toHaveText(title);
}

async function joinRoom(page, { origin, roomId, username }) {
  await page.goto(`${origin}/?room=${roomId}`);
  await expect(page.locator('#room-id-input')).toHaveValue(roomId);
  await enterUser(page, { username });
  await page.locator('#join-room-btn').click();
  await expect(page.locator('#room-view')).toBeVisible();
  await expect(page.locator('#display-room-id')).toHaveText(roomId);
}

async function createHostRoom(page, { origin, username, userId }) {
  await openSeededPage(page, { origin, userId });
  await enterUser(page, { username });

  return createRoom(page);
}

async function joinAdditionalUser(browser, testInfo, { origin, roomId, username, userId }) {
  const { context, page } = await createAdditionalUserPage(browser, testInfo, {
    userId
  });
  await joinRoom(page, { origin, roomId, username });

  return { context, page };
}

test('room entry, song request, and realtime sync work in a browser', async ({ browser, page }, testInfo) => {
  const server = await createTestServer();
  const runId = createRunId();
  const userA = `A-${runId}`;
  const userB = `B-${runId}`;
  const song = {
    title: `Song-${runId}`,
    singer: `Singer-${runId}`
  };
  const contexts = [];

  try {
    const roomId = await createHostRoom(page, {
      origin: server.origin,
      username: userA,
      userId: createUserId(1)
    });
    await requestFirstSong(page, song);

    const userBSession = await joinAdditionalUser(browser, testInfo, {
      origin: server.origin,
      roomId,
      username: userB,
      userId: createUserId(2)
    });
    contexts.push(userBSession.context);

    await expect(userBSession.page.locator('#playing-title')).toHaveText(song.title);
    await expect(page.locator('#online-count-txt')).toHaveText('2 人在线');
    await expect(userBSession.page.locator('#online-count-txt')).toHaveText('2 人在线');
    await expect(page.locator('#room-view')).toBeVisible();
    await expect(userBSession.page.locator('#room-view')).toBeVisible();
  } finally {
    try {
      await closeContexts(contexts);
    } finally {
      await closeTestServer(server);
    }
  }
});

test('room links prefill the join form for an existing room', async ({ browser, page }, testInfo) => {
  const server = await createTestServer();
  const runId = createRunId();
  const contexts = [];

  try {
    const roomId = await createHostRoom(page, {
      origin: server.origin,
      username: `Host-${runId}`,
      userId: createUserId(11)
    });

    const userBSession = await createAdditionalUserPage(browser, testInfo, {
      userId: createUserId(12)
    });
    contexts.push(userBSession.context);

    await userBSession.page.goto(`${server.origin}/?room=${roomId}`);
    await expect(userBSession.page.locator('#room-id-input')).toHaveValue(roomId);
    await enterUser(userBSession.page, { username: `Guest-${runId}` });
    await userBSession.page.locator('#join-room-btn').click();

    await expect(userBSession.page.locator('#room-view')).toBeVisible();
    await expect(userBSession.page.locator('#display-room-id')).toHaveText(roomId);
  } finally {
    try {
      await closeContexts(contexts);
    } finally {
      await closeTestServer(server);
    }
  }
});

test('duplicate usernames are rejected in the browser flow', async ({ browser, page }, testInfo) => {
  const server = await createTestServer();
  const runId = createRunId();
  const username = `Singer-${runId}`;
  const contexts = [];

  try {
    const roomId = await createHostRoom(page, {
      origin: server.origin,
      username,
      userId: createUserId(21)
    });
    const userBSession = await createAdditionalUserPage(browser, testInfo, {
      userId: createUserId(22)
    });
    contexts.push(userBSession.context);

    await userBSession.page.goto(`${server.origin}/?room=${roomId}`);
    await enterUser(userBSession.page, { username });

    const dialogPromise = userBSession.page.waitForEvent('dialog', {
      timeout: 10_000
    });
    const clickPromise = userBSession.page.locator('#join-room-btn').click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('昵称');
    await dialog.accept();
    await clickPromise;

    await expect(userBSession.page.locator('#login-view')).toBeVisible();
    await expect(userBSession.page.locator('#room-view')).toBeHidden();
  } finally {
    try {
      await closeContexts(contexts);
    } finally {
      await closeTestServer(server);
    }
  }
});

test('profile rename syncs to other room members', async ({ browser, page }, testInfo) => {
  const server = await createTestServer();
  const runId = createRunId();
  const oldName = `Guest-${runId}`;
  const newName = `Renamed-${runId}`;
  const contexts = [];

  try {
    const roomId = await createHostRoom(page, {
      origin: server.origin,
      username: `Host-${runId}`,
      userId: createUserId(31)
    });
    const userBSession = await joinAdditionalUser(browser, testInfo, {
      origin: server.origin,
      roomId,
      username: oldName,
      userId: createUserId(32)
    });
    contexts.push(userBSession.context);

    await userBSession.page.locator('#user-profile-widget').click();
    await expect(userBSession.page.locator('#profile-modal')).toBeVisible();
    await userBSession.page.locator('#modal-username').fill(newName);
    await userBSession.page.locator('#modal-save-btn').click();
    await expect(userBSession.page.locator('#profile-modal')).toBeHidden();

    await expect(page.locator('#members-list-container')).toContainText(newName);
    await expect(page.locator('#members-list-container')).not.toContainText(oldName);
  } finally {
    try {
      await closeContexts(contexts);
    } finally {
      await closeTestServer(server);
    }
  }
});

test('host admin controls are visible while guests cannot use them', async ({ browser, page }, testInfo) => {
  const server = await createTestServer();
  const runId = createRunId();
  const contexts = [];

  try {
    const roomId = await createHostRoom(page, {
      origin: server.origin,
      username: `Host-${runId}`,
      userId: createUserId(41)
    });
    const userBSession = await joinAdditionalUser(browser, testInfo, {
      origin: server.origin,
      roomId,
      username: `Guest-${runId}`,
      userId: createUserId(42)
    });
    contexts.push(userBSession.context);

    await expect(page.locator('#next-btn')).toBeVisible();
    await page.locator('#admin-menu-btn').click();
    await expect(page.locator('#admin-dropdown-menu')).toBeVisible();
    await expect(page.locator('#admin-only-section')).toBeVisible();

    await expect(userBSession.page.locator('#next-btn')).toBeHidden();
    await userBSession.page.locator('#admin-menu-btn').click();
    await expect(userBSession.page.locator('#admin-dropdown-menu')).toBeVisible();
    await expect(userBSession.page.locator('#admin-only-section')).toBeHidden();
  } finally {
    try {
      await closeContexts(contexts);
    } finally {
      await closeTestServer(server);
    }
  }
});

test('queue advancement syncs now playing and history state', async ({ browser, page }, testInfo) => {
  const server = await createTestServer();
  const runId = createRunId();
  const firstSong = {
    title: `First-${runId}`,
    singer: `Singer-${runId}`
  };
  const secondSong = {
    title: `Second-${runId}`,
    singer: `Singer-${runId}`
  };
  const contexts = [];

  try {
    const roomId = await createHostRoom(page, {
      origin: server.origin,
      username: `Host-${runId}`,
      userId: createUserId(51)
    });
    const userBSession = await joinAdditionalUser(browser, testInfo, {
      origin: server.origin,
      roomId,
      username: `Guest-${runId}`,
      userId: createUserId(52)
    });
    contexts.push(userBSession.context);

    await requestFirstSong(page, firstSong);
    await submitSong(userBSession.page, secondSong);
    await expect(page.locator('#song-count-badge')).toHaveText('2 首');
    await expect(userBSession.page.locator('#song-count-badge')).toHaveText('2 首');

    await page.locator('#next-btn').click();

    await expect(page.locator('#playing-title')).toHaveText(secondSong.title);
    await expect(userBSession.page.locator('#playing-title')).toHaveText(secondSong.title);
    await expect(page.locator('#history-count-badge')).toHaveText('1 首');
    await expect(userBSession.page.locator('#history-count-badge')).toHaveText('1 首');
    await expect(page.locator('#song-count-badge')).toHaveText('1 首');
    await expect(userBSession.page.locator('#song-count-badge')).toHaveText('1 首');
  } finally {
    try {
      await closeContexts(contexts);
    } finally {
      await closeTestServer(server);
    }
  }
});

test('stats, about, and archive entry points open without page errors', async ({ page }) => {
  const server = await createTestServer();
  const runId = createRunId();

  try {
    await createHostRoom(page, {
      origin: server.origin,
      username: `Host-${runId}`,
      userId: createUserId(61)
    });
    await requestFirstSong(page, {
      title: `Modal-${runId}`,
      singer: `Singer-${runId}`
    });

    const pageProblems = watchPageProblems(page);

    await page.locator('#admin-menu-btn').click();
    await page.locator('#dropdown-stats-btn').click();
    await expect(page.locator('#stats-playlist-container')).toBeVisible();

    await page.locator('#admin-menu-btn').click();
    await page.locator('#dropdown-about-btn').click();
    await expect(page.locator('#about-modal')).toBeVisible();
    await page.locator('#close-about-ok-btn').click();
    await expect(page.locator('#about-modal')).toBeHidden();

    await page.locator('#corner-egg-btn').click();
    await expect(page.locator('#archive-modal')).toBeVisible();
    await page.locator('#archive-cancel-btn').click();
    await expect(page.locator('#archive-modal')).toBeHidden();

    expect(pageProblems).toEqual([]);
  } finally {
    await closeTestServer(server);
  }
});

test('mobile notification entry point opens activity on song updates', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile-only notification entry point.');

  const server = await createTestServer();
  const runId = createRunId();
  const song = {
    title: `Mobile-${runId}`,
    singer: `Singer-${runId}`
  };

  try {
    await createHostRoom(page, {
      origin: server.origin,
      username: `Host-${runId}`,
      userId: createUserId(71)
    });
    await requestFirstSong(page, song);
    await expect(page.locator('#toast-history-list')).toContainText(song.title);

    await page.locator('#mobile-toast-trigger').click();
    await expect(page.locator('.notifications-section')).toHaveClass(/open-on-mobile/);
  } finally {
    await closeTestServer(server);
  }
});
