import express from 'express';
import cors from 'cors';
import request from 'request';

function parseProxyParameters(proxyRequest) {
  const params = {};
  // Extract target URL from the query parameters
  const urlMatch = proxyRequest.url.match(/(?<=[?&])url=(?<url>.*)$/);
  if (urlMatch) {
    params.url = decodeURIComponent(urlMatch.groups.url);
  }
  
  return params;
}

const app = express();
app.use(cors());
app.set('json spaces', 2);

app.all('/*', async (req, res) => {
  try {
    const proxyParams = parseProxyParameters(req);
    if (!proxyParams.url) {
      return res.status(400).json({
        "title": "CORS代理错误-缺少必需参数",
        "detail": "未提供参数：url",
        "tips": "可选域: https://cors.qdqqd.com/?url= , https://cors-qdqqd.vercel.app/?url=",
      });
    }

    // Prepare the options for the request
    const options = {
      url: proxyParams.url,
      method: req.method, // Preserve the original request method (GET, POST, etc.)
      headers: {
        ...req.headers, // Forward headers from the original request
        'Referer': `https://${req.get('host')}`, // Set dynamic Referer
      },
      json: req.method !== 'GET' ? req.body : undefined, // Include body for non-GET requests
    };

    // Proxy the request to the target URL
    request(options, (error, response, body) => {
      if (error) {
        console.error('Request error:', error);
        return res.status(500).json({
          "title": "CORS代理错误-内部服务器错误",
          "detail": error.message,
          "tips": "可选域: https://cors.qdqqd.com/?url= , https://cors-qdqqd.vercel.app/?url=",
        });
      }
      
      // Set response status and headers from the target response
      res.status(response.statusCode);
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Send the body of the target response
      res.send(body);
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      "title": "CORS代理错误-内部服务器错误",
      "detail": err.message,
      "tips": "可选域: https://cors.qdqqd.com/?url= , https://cors-qdqqd.vercel.app/?url=",
    });
  }
});

export default app;
