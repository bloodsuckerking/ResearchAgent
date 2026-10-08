import type {Report,Source,Claim} from './types';
export function reportMarkdown(report:Report,sources:Source[],claims:Claim[]):string{
 return `# ${report.title}\n\n${report.summary}\n\n`+report.sections.map(s=>`## ${s.title}\n\n`+s.paragraphs.map(p=>p.text+' '+p.sourceIds.map(id=>`[${id}]`).join('')).join('\n\n')).join('\n\n')+`\n\n## Recommendations / 建议\n\n${report.recommendations}\n\n## Limitations / 局限性\n\n${report.limitations}\n\n## Evidence review / 证据审阅\n\n`+claims.map(c=>`- ${c.claim} (${c.status}) ${c.sourceIds.map(id=>`[${id}]`).join('')}\n  ${c.evidence}`).join('\n')+'\n\n## Sources\n\n'+sources.map(s=>`[${s.id}] ${s.title} — ${s.url} (${s.read?'Page retrieved':'Snippet only'})`).join('\n');
}
