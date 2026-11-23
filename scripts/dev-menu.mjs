import { spawn } from 'node:child_process';
import { cp, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const release = path.join(root, 'release');
const target = path.join(root, '.tmp', 'cargo-target');

function run(action) {
  return new Promise((resolve, reject) => {
    // Windows 通过 shell 调用 pnpm.cmd；命令仅由菜单中的固定值组成。
    const child = spawn('pnpm', ['tauri', action], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: action === 'build'
        ? { ...process.env, CARGO_TARGET_DIR: target }
        : process.env,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`命令未成功完成（${signal ?? code}）`));
    });
  });
}

async function collectBuild() {
  // 使用独立 target 目录，避免依赖用户的 Cargo 输出目录设置。
  const output = path.join(target, process.env.CARGO_BUILD_TARGET || '', 'release');
  await mkdir(release, { recursive: true });
  const binary = process.platform === 'win32' ? 'lan-drop.exe' : 'lan-drop';
  await cp(path.join(output, binary), path.join(release, binary));
  // 安装包与其他编译产物保留在 .tmp/，release/ 仅导出可执行程序。
}

async function main() {
  for (;;) {
    const input = createInterface({ input: stdin, output: stdout });
    let choice;
    try {
      choice = (await input.question(
        '\n1：启动开发（pnpm tauri dev）\n2：生成图标（pnpm tauri icon）\na：构建并导出独立程序到 release/\nq：退出\n请输入并回车：',
      )).trim().toLowerCase();
    } finally {
      input.close();
    }
    if (choice === 'q') return;
    const action = { '1': 'dev', '2': 'icon', a: 'build' }[choice];
    if (!action) {
      console.log('无效输入，请输入 1、2、a 或 q。');
      continue;
    }
    try {
      await run(action);
      if (action === 'build') {
        await collectBuild();
        console.log(`构建产物已导出：${release}`);
      }
    } catch (error) {
      console.error(`操作失败：${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(`菜单已退出：${error.message}`);
  process.exitCode = 1;
});
