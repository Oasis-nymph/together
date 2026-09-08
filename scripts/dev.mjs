// 一键开发启动：同时跑 API 代理(8787) 和 Vite 前端(5173)
import { spawn } from 'node:child_process';

const children = [
  spawn('node', ['server/server.mjs'], { stdio: 'inherit' }),
  spawn('node', ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];

children.forEach((c) =>
  c.on('exit', (code) => {
    console.log('[together] 子进程退出，关闭全部…');
    children.forEach((x) => x.kill());
    process.exit(code ?? 0);
  })
);
