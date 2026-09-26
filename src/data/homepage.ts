export interface ContentSection {
  id: string;
  title: string;
  lines: string[];
  links?: { label: string; href: string }[];
}

// Shared by the static page and terminal commands; replace placeholders here.
export const sections: ContentSection[] = [
  {
    id: 'about',
    title: '关于我',
    lines: ['zhu-chen', '个人学术主页 · 个人介绍正在整理中。'],
  },
  {
    id: 'projects',
    title: '项目与论文',
    lines: ['项目与论文内容正在整理中。'],
  },
  {
    id: 'contact',
    title: '联系与链接',
    lines: ['更多联系方式正在整理中。'],
    links: [{ label: 'GitHub', href: 'https://github.com/zhu-chen' }],
  },
];

export function sectionText(section: ContentSection): string {
  return [
    ...section.lines,
    ...(section.links ?? []).map((link) => `${link.label}: ${link.href}`),
  ].join('\n');
}
