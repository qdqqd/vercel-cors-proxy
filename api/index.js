import express from 'express';
import cors    from 'cors';
import request from 'request'

function parseProxyParameters(proxyRequest){
  const params = {}
  // url - treat everything right to url= query parameter as target url value
  const urlMatch = proxyRequest.url.match(/(?<=[?&])url=(?<url>.*)$/)
  if(urlMatch) {
    params.url =  decodeURIComponent(urlMatch.groups.url)
  }
  
  return params
}

const app = express();
app.use(cors());
app.set('json spaces', 2)
app.all('/*', async (req, res) => {
  try {
    const proxyParams = parseProxyParameters(req)
    if(!proxyParams.url) {
      return res.status(400).json({
        "title": "CORS代理错误-缺少必需参数",
        "detail": "未提供参数：url",
        "tips": "可选域:https://cors.qdqqd.com/?url= , https://cors-qdqqd.vercel.app/?url=",
      }) 
    }
    
    // proxy request to target url
    const target = request(proxyParams.url)
    req.pipe(target)
    target.pipe(res)
    
  } catch(err) { 
    console.error(err)
    return res.status(500).json({
      "title": "CORS代理错误-内部服务器错误",
      "detail": err.message,
      "tips": "可选域:https://cors.qdqqd.com/?url= , https://cors-qdqqd.vercel.app/?url=",
    }) 
  }
})

export default app;
