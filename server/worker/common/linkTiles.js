// server/worker/common/linkTiles.js
const fs = require("fs");
const path = require("path");

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// 폴더/파일 재귀 삭제
function removeDirRecursive(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDirRecursive(src, dest) {
  ensureDirSync(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else if (entry.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(s), d);
    else fs.copyFileSync(s, d);
  }
}

function tryMakeLinkOrCopy(src, dest) {
  // ✅ 항상 새로 만들도록 기존 경로 삭제
  if (fs.existsSync(dest)) {
    console.log(`⚠️ 기존 tiles 폴더 삭제: ${dest}`);
    removeDirRecursive(dest);
  }
  try {
    fs.symlinkSync(src, dest, "junction"); // 윈도우 디렉터리 링크
    return { created: true, path: dest, mode: "symlink" };
  } catch (e) {
    copyDirRecursive(src, dest);
    return { created: true, path: dest, mode: "copy" };
  }
}

// exec 기준 경로가 'server'면 한 단계 위(프로젝트 루트)로 올리기
function bumpOutIfServer(baseDir) {
  return path.basename(baseDir).toLowerCase() === "server"
    ? path.dirname(baseDir)
    : baseDir;
}

function isRuntimeMode() {
  if (process.env.LINK_MODE) {
    return String(process.env.LINK_MODE).toLowerCase() === "runtime";
  }
  return !!process.pkg; // pkg 빌드된 exe면 true
}

/**
 * 목표:
 *  DEV:
 *    - A) (프로젝트루트)/public/tiles  ← 이것만!
 *  RUNTIME/배포:
 *    - B') (실행폴더)/public/public/tiles
 *    - B ) (실행폴더)/public/tiles
 */
function linkTiles() {
  const runtime = isRuntimeMode();

  const execBase = runtime
    ? path.dirname(process.execPath)        // exe 배포 위치
    : path.resolve(__dirname, "../..");     // dev: server

  const rootBase = bumpOutIfServer(execBase); // dev일 때 server 바깥이 프로젝트 루트

  const sourceTiles = process.env.TILES_SRC || "C:\\GIT\\tiles";

  console.log("[linkTiles]");
  console.log("  runtime     :", runtime);
  console.log("  execBase    :", execBase);
  console.log("  rootBase    :", rootBase);
  console.log("  sourceTiles :", sourceTiles);

  if (!fs.existsSync(sourceTiles)) {
    console.error("❌ 원본 타일 폴더가 없습니다:", sourceTiles);
    return;
  }

  if (!runtime) {
    // -------- DEV --------
    // ✅ 바깥 루트 public/tiles만 생성
    const rootPublic = path.join(rootBase, "public");
    const rootTiles = path.join(rootPublic, "tiles");
    ensureDirSync(rootPublic);
    const resA = tryMakeLinkOrCopy(sourceTiles, rootTiles);
    console.log(`DEV-A) ${resA.path} (${resA.mode})`);
  } else {
    // -------- RUNTIME/배포 --------
    const execPublic = path.join(execBase, "public");

    // B') 실행폴더/public/public/tiles (요청 URL이 /public/tiles/... 인 경우 대응)
    const execPublicPublic = path.join(execPublic, "public");
    const execPublicPublicTiles = path.join(execPublicPublic, "tiles");
    ensureDirSync(execPublicPublic);
    const resBprime = tryMakeLinkOrCopy(sourceTiles, execPublicPublicTiles);
    console.log(`RUN-B') ${resBprime.path} (${resBprime.mode})`);

    // B ) 실행폴더/public/tiles (/tiles/... 요청 대응)
    const execTiles = path.join(execPublic, "tiles");
    ensureDirSync(execPublic);
    const resB = tryMakeLinkOrCopy(sourceTiles, execTiles);
    console.log(`RUN-B ) ${resB.path} (${resB.mode})`);
  }
}

module.exports = { linkTiles };
