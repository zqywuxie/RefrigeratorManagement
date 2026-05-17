import pool from './server/db.js';
import fs from 'fs';

const TABLE_COMMENTS = {
  users:                '-- 用户表：存储系统登录用户（root/admin/user），密码hash，角色',
  refrigerators:        '-- 冰箱表：存储冰箱信息，包括类型(drawer/shelf)、行列数、温度、软删除',
  samples:              '-- 旧系统样本表：legacy容器数据，上下层格子中的样本记录',
  sub_samples:          '-- 旧系统副样本表：legacy容器内的细分项',
  drawers:              '-- 抽屉表：冰箱下层抽屉，固定布局(第1层2×3=6个, 第2层5×3=15个)，冰箱创建时自动生成',
  boxes:                '-- 盒子表：抽屉内的样本盒，支持简略(simple)和精细(precise)两种模式，精细模式设置网格行列',
  box_cells:            '-- 盒子孔位表(旧)：精细模式下的盒内样本格位，已被tubes表替代',
  upper_items:          '-- 上层物品表：冰箱上层开放存储的物品，卡片式管理，支持box_mode切换为孔位模式',
  sample_records:       '-- 样本记录表(新)：患者样本核心数据，必填姓名+编号，可选来源/类型/阶段/时间/标签/备注',
  tubes:                '-- 试管表(新)：样本记录下的试管，每个试管占据盒子一个孔位(box_id+position唯一)，支持拖拽移动',
  item_types:           '-- 物品类型表：上层物品的分类标签（试剂/样本/耗材/临时物品）',
  sample_types:         '-- 样本类型表：样本的分类标签（血清/血浆/尿液/DNA/组织/全血等）',
};

async function main() {
  const [tables] = await pool.query("SHOW TABLES");
  fs.mkdirSync('db', { recursive: true });
  let allSQL = '-- ============================================================\n';
  allSQL += '-- Biofridge 实验室冰箱管理系统 - 数据库结构\n';
  allSQL += '-- Generated: ' + new Date().toISOString() + '\n';
  allSQL += '-- ============================================================\n\n';

  for (const row of tables) {
    const name = Object.values(row)[0];
    const comment = TABLE_COMMENTS[name] || '';
    const [[createRow]] = await pool.query(`SHOW CREATE TABLE \`${name}\``);
    const ddl = comment + '\n' + createRow['Create Table'] + ';\n';
    allSQL += '-- Table: ' + name + '\n' + ddl + '\n';
    fs.writeFileSync('db/' + name + '.sql', ddl);
    console.log('  Exported:', name);
  }

  fs.writeFileSync('db/schema.sql', allSQL);
  console.log('\nDone. ' + tables.length + ' tables exported to db/');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
