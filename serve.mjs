import {createSiteServer} from './cms-server.mjs';
const port=Number(process.env.PORT)||4186,host=process.env.HOST||'127.0.0.1';
createSiteServer().listen(port,host,()=>console.log(`АЭРОН: http://${host}:${port}\nАдминка: http://${host}:${port}/admin/`));
