// App
const Koa = require('koa');

const app = new Koa();

const router = require('./routes').router;

// Error handling
app.on('error', (err, ctx) => {
    console.error('server error', err, ctx)
});

// Logging
app.use(async (ctx, next) => {
    await next();
    const rt = ctx.response.get('X-Response-Time');
    console.log(`${ctx.method} ${ctx.url} - ${rt}`);
});

// X-Response-Time
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
});

// Routes
app.use(router.routes()).use(router.allowedMethods());

// Run
app.listen(8080);
