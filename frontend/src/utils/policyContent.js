// Existing owner-managed home policy blocks contain the complete published terms.
// Keep their text intact and read it at runtime so admin edits remain effective.
export const policyKeys = { 'return-policy':'returns', shipping:'shipping', 'after-sales':'afterSales' };
export function policyContent(slug,payload,lang) {
  const key=policyKeys[slug];
  const policy=(payload.homeBlocks||[]).find(b=>b.block_key===`home.policy.${key}.body`||b.block_key===`policy.${key}.body`);
  const blocks=(payload.blocks||[]).filter(b=>b.block_type!=='hero'&&!b.block_key?.endsWith('.hero'));
  const body=policy?.[`content_${lang}`]||blocks.map(b=>b[`content_${lang}`]).filter(Boolean).join('\n\n');
  return {body,originalArabic:lang!=='ar'?policy?.content_ar||'':''};
}
