import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import { createShareQServer } from '../../src/app.js';

const silentLogger = {
  log() {},
  error() {}
};

function listen(server) {
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function createTestServer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shareq-e2e-'));
  const shareq = createShareQServer({
    dataFile: path.join(tmpDir, 'rooms.json'),
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
  const baseId = Date.now() % 900_000;
  return String(100_000 + ((baseId + offset) % 900_000));
}

function contextOptionsForProject(projectUse) {
  const contextKeys = [
    'viewport',
    'deviceScaleFactor',
    'isMobile',
    'hasTouch',
    'userAgent'
  ];
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
  globalThis.localStorage.removeItem('shareq_last_room');
  globalThis.localStorage.removeItem('shareq_username');
}

async function enterUser(page, { username }) {
  await page.locator('#setup-username').fill(username);
}

async function createRoom(page) {
  await page.locator('.tab-btn[data-tab="create"]').click();
  await page.locator('#create-room-btn').click();
  await expect(page.locator('#room-view')).toBeVisible();
  await expect(page.locator('#display-room-id')).toHaveText(/[A-Z0-9]{5}/);

  return (await page.locator('#display-room-id').textContent()).trim();
}

async function requestSong(page, { title, singer }) {
  await page.locator('#song-title').fill(title);
  await page.locator('#song-singer').fill(singer);
  await page.locator('#confirm-request-btn').click();
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

test('room entry, song request, and realtime sync work in a browser', async ({ browser, page }, testInfo) => {
  const server = await createTestServer();
  const runId = createRunId();
  const userA = `A-${runId}`;
  const userB = `B-${runId}`;
  const song = {
    title: `Song-${runId}`,
    singer: `Singer-${runId}`
  };
  let userBContext;

  try {
    await page.addInitScript(seedUserStorage, { userId: createUserId(1) });
    await page.goto(server.origin);
    await enterUser(page, { username: userA });

    const roomId = await createRoom(page);
    await requestSong(page, song);

    userBContext = await browser.newContext(
      contextOptionsForProject(testInfo.project.use)
    );
    await userBContext.addInitScript(seedUserStorage, {
      userId: createUserId(2)
    });
    const userBPage = await userBContext.newPage();

    await joinRoom(userBPage, {
      origin: server.origin,
      roomId,
      username: userB
    });

    await expect(userBPage.locator('#playing-title')).toHaveText(song.title);
    await expect(page.locator('#online-count-txt')).toHaveText('2 人在线');
    await expect(userBPage.locator('#online-count-txt')).toHaveText('2 人在线');
    await expect(page.locator('#room-view')).toBeVisible();
    await expect(userBPage.locator('#room-view')).toBeVisible();
  } finally {
    try {
      await userBContext?.close();
    } finally {
      await closeTestServer(server);
    }
  }
});
