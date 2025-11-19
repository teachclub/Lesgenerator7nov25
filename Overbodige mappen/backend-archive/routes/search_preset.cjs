const express=require('express');
const router=express.Router();

async function europeanaSearch(query,mediaType,rows){
  const wskey=process.env.EUROPEANA_API_KEY||'';
  const base='https://api.europeana.eu/record/v2/search.json';
  const params=new URLSearchParams();
  params.set('wskey',wskey);
  params.set('query',query);
  params.set('rows',String(rows));
  params.set('profile','standard');
  if(mediaType==='IMAGE') params.append('qf','TYPE:IMAGE');
  if(mediaType==='TEXT') params.append('qf','TYPE:TEXT');
  const url=`${base}?${params.toString()}`;
  const resp=await fetch(url);
  if(!resp.ok) throw new Error('europeana_error');
  const data=await resp.json();
  const items=data.items||[];
  return items.map(it=>{
    const thumb=it.edmPreview?`https://api.europeana.eu/thumbnail/v2/url.json?uri=${encodeURIComponent(it.edmPreview[0])}&type=IMAGE`:null;
    return{
      provider:'europeana',
      id:it.id,
      type:mediaType,
      title:(it.title&&it.title[0])||'',
      data_provider:(it.dataProvider&&it.dataProvider[0])||'',
      lang:(it.language&&it.language[0])||'',
      thumbnail:thumb,
      link:it.guid||it.link||''
    };
  });
}

module.exports=app=>{
  router.post('/api/search-preset',express.json(),async(req,res)=>{
    try{
      const{query='',limit=6,ratio}=req.body||{};
      const rtext=ratio&&Number(ratio.text)>=0?Number(ratio.text):4;
      const rimg=ratio&&Number(ratio.image)>=0?Number(ratio.image):2;
      const total=Math.max(1,Number(limit)||6);
      const wantText=Math.min(total,rtext);
      const wantImg=Math.max(0,Math.min(total-wantText,rimg));
      const wantExtra=total-(wantText+wantImg);
      const[texts,images]=await Promise.all([
        europeanaSearch(query,'TEXT',wantText+wantExtra),
        europeanaSearch(query,'IMAGE',wantImg+wantExtra)
      ]);
      const preset=texts.slice(0,wantText).concat(images.slice(0,wantImg));
      res.json({ok:true,query,count:preset.length,ratio:{text:wantText,image:wantImg},preset});
    }catch(e){
      res.status(500).json({ok:false,error:'search_preset_failed'});
    }
  });
  app.use(router);
};

