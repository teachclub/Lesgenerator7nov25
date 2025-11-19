const express=require("express");
const router=express.Router();
const buildChips=require("../services/a06.chips.cjs");

router.post("/", async (req,res)=>{
  const {query="",tv="",ka="",limit=48}=req.body||{};
  try{
    const chips=await buildChips({query,tv,ka,max:limit});
    res.json({ok:true,query,tv,ka,count:chips.length,chips});
  }catch(e){
    res.status(500).json({ok:false,error:String(e)});
  }
});

module.exports=router;

