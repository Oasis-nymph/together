/** 内置基准任务：带关键点清单，供裁判模型做"任务完成度"打分 */
export interface BenchTask {
  id: string;
  name: string;
  task: string;
  keypoints: string[];
}

export const BENCH_TASKS: BenchTask[] = [
  {
    id: 'cooperation',
    name: '合作如何产生',
    task: '讨论：合作是如何在自利个体之间产生的？请最终给出一个共同结论。',
    keypoints: ['重复博弈与长期关系', '以牙还牙或互惠策略', '声誉与信任的形成', '宽容与报复的平衡'],
  },
  {
    id: 'autods',
    name: '自主数据科学系统',
    task: 'AI 如何构建自主数据科学系统？请合作给出完整方案。',
    keypoints: [
      '分层或闭环架构',
      '数据获取与质量保障',
      '建模与实验执行',
      '验证与自我纠错机制',
      '安全边界与人工监督',
    ],
  },
];
