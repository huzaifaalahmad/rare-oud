export function displayDimensions(value,lang='ar') {
 const text=String(value||'').trim();
 const values=text.match(/\d+(?:[.,]\d+)?/g);
 return !text||(values&&values.every(n=>Number(n.replace(',','.'))===0)) ? (lang==='ar'?'غير مذكورة':'Not specified') : text;
}
