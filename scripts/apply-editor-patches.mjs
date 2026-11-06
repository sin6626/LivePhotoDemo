import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// 应用博客同版本修复与 Demo 图片扩展补丁；不修改或引用博客的 node_modules。
for (const file of readdirSync(new URL('../patches/', import.meta.url)).filter(name => name.endsWith('.patch'))) {
  const match = file.match(/^(@[^_]+)__([^@]+)@[^/]+\.patch$/);
  if (!match) throw new Error(`未知补丁名称：${file}`);
  const directory = `node_modules/${match[1]}/${match[2]}`;
  // pnpm 补丁中的这两份声明以换行结尾，npm tarball 原文件没有末尾换行。
  if (match[2] === 'rich-editor') {
    for (const name of ['commands-entry.d.ts', 'plugins-entry.d.ts']) {
      const path = `${directory}/dist/${name}`;
      const text = readFileSync(path, 'utf8');
      if (!text.endsWith('\n')) writeFileSync(path, `${text}\n`);
    }
  }
  const args = ['apply', `--directory=${directory}`, `patches/${file}`];
  const check = spawnSync('git', [...args, '--reverse', '--check'], { encoding: 'utf8' });
  if (check.status === 0) continue;
  const apply = spawnSync('git', args, { encoding: 'utf8' });
  if (apply.status !== 0) throw new Error(`编辑器补丁失败 ${file}\n${apply.stderr}`);
  console.log(`已应用 ${file}`);
}
