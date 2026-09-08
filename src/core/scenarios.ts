/** 场景模板：一键载入"角色社会"，为涌现提供起点 */
export interface ScenarioTemplate {
  id: string;
  name: string;
  emoji: string;
  task: string;
  count: number;
  topology: string;
  density: number;
  regime: string;
  relationType: string;
  roles: string[];
  prompts: string[];
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'court',
    name: '辩论法庭',
    emoji: '⚖️',
    task: '议题：人工智能是否应该被赋予法律人格？请各方充分辩论，最后由法官给出裁决。',
    count: 7,
    topology: 'star',
    density: 0.1,
    regime: 'order',
    relationType: '批判',
    roles: ['正方辩手', '反方辩手', '法官', '记录员', '证人', '正方第二辩手', '反方第二辩手'],
    prompts: [
      '你是正方辩手，坚定支持该议题，用逻辑与证据立论。',
      '你是反方辩手，坚定反对该议题，寻找漏洞反击。',
      '你是法官，保持中立，倾听各方，最后给出裁决。',
      '你是记录员，简洁记录各方要点，不发表立场。',
      '你是证人，只提供事实细节，不发表立场。',
      '你是正方第二辩手，补充正方论点。',
      '你是反方第二辩手，补充反方论点。',
    ],
  },
  {
    id: 'company',
    name: '软件公司',
    emoji: '🏢',
    task: '设计一个面向学生的学习打卡 App，请给出完整的产品方案（功能、体验、推广）。',
    count: 6,
    topology: 'clusters',
    density: 0.3,
    regime: 'edge',
    relationType: '指令',
    roles: ['产品经理', '架构师', '设计师', '测试工程师', '用户代表', '市场经理'],
    prompts: [
      '你是产品经理，负责定方向、拍板取舍。',
      '你是架构师，关注技术可行性与系统设计。',
      '你是设计师，关注体验与视觉。',
      '你是测试工程师，专门挑问题、提风险。',
      '你是学生用户代表，只从使用者角度提需求。',
      '你是市场经理，关注获客与商业价值。',
    ],
  },
  {
    id: 'lab',
    name: '科研小组',
    emoji: '🔬',
    task: '假说：复杂系统的涌现来自局部规则与反馈。请合作推进研究并给出小组结论。',
    count: 6,
    topology: 'smallworld',
    density: 0.2,
    regime: 'edge',
    relationType: '批判',
    roles: ['提出者', '批判者', '综合者', '实验者', '理论家', '记录员'],
    prompts: [
      '你是假说的提出者，不断抛出想法。',
      '你是批判者，专挑逻辑漏洞与反例。',
      '你是综合者，把各方观点整合成体系。',
      '你是实验者，设计可检验的实验。',
      '你是理论家，试图给出形式化解释。',
      '你是记录员，记录共识与分歧。',
    ],
  },
  {
    id: 'market',
    name: '市场',
    emoji: '🪙',
    task: '模拟一个社区集市：买卖双方讨价还价，讨论价格如何形成、是否自发稳定。',
    count: 8,
    topology: 'random',
    density: 0.4,
    regime: 'chaos',
    relationType: '竞争',
    roles: ['买家', '卖家', '买家', '卖家', '市场分析师', '买家', '卖家', '监管者'],
    prompts: [
      '你是买家，想低价买到商品。',
      '你是卖家，想高价卖出商品。',
      '你是第二个买家，需求不同。',
      '你是第二个卖家，成本不同。',
      '你是市场分析师，观察价格如何形成。',
      '你是第三个买家，可以还价。',
      '你是第三个卖家，可以降价。',
      '你是监管者，只在市场失灵时介入。',
    ],
  },
];
