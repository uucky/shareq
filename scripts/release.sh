#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'USAGE'
Usage: bash scripts/release.sh [BUMP|VERSION] [--push]

BUMP may be one of: major, minor, patch, premajor, preminor, prepatch, prerelease.
If omitted, BUMP defaults to patch.

Examples:
  bash scripts/release.sh
  bash scripts/release.sh minor
  bash scripts/release.sh 1.9.0 --push
USAGE
}

die() {
    echo "error: $*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || die "$1 is required"
}

require_clean_worktree() {
    [[ -z "$(git status --porcelain)" ]] || die 'working tree is not clean'
}

version_from_package() {
    node -e "console.log(require(process.argv[1]).version)" "$1"
}

release_arg=''
push=0

while (($#)); do
    case "$1" in
        -h|--help)
            usage
            exit 0
            ;;
        --push)
            push=1
            ;;
        --*)
            die "unknown option: $1"
            ;;
        *)
            [[ -z "$release_arg" ]] || die 'only one bump or version argument is allowed'
            release_arg="$1"
            ;;
    esac
    shift
done

release_arg="${release_arg:-patch}"

require_command git
require_command node
require_command npm

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

require_clean_worktree

case "$release_arg" in
    v*)
        die 'pass the project version without a leading v'
        ;;
    major|minor|patch|premajor|preminor|prepatch|prerelease)
        ;;
    *)
        if [[ ! "$release_arg" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$ ]]; then
            die "expected an npm version bump or an exact semver version, got: $release_arg"
        fi
        ;;
esac

tmpdir="$(mktemp -d)"
cleanup() {
    rm -rf "$tmpdir"
}
trap cleanup EXIT

cp package.json package-lock.json "$tmpdir"/
(
    cd "$tmpdir"
    npm version "$release_arg" --no-git-tag-version --allow-same-version --ignore-scripts >/dev/null
)

target_version="$(version_from_package "$tmpdir/package.json")"
tag="v$target_version"

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
    die "local tag already exists: $tag"
fi

if git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1; then
    die "remote tag already exists: $tag"
fi

npm version "$release_arg" --no-git-tag-version --allow-same-version --ignore-scripts >/dev/null

version="$(version_from_package "$repo_root/package.json")"
[[ "$version" == "$target_version" ]] || die "expected version $target_version, got $version"

tag="v$version"

git add package.json package-lock.json
if git diff --cached --quiet; then
    echo "Version is already $version; no release commit created."
else
    git commit -m "Release $tag"
fi

git tag -a "$tag" -m "$tag"
echo "Created tag $tag"

if ((push)); then
    branch="$(git branch --show-current)"
    [[ -n "$branch" ]] || die 'cannot push from detached HEAD'
    git push origin "$branch" "$tag"
else
    echo "To publish: git push origin HEAD $tag"
fi
