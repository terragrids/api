'use strict';

import Koa from 'koa';
import Router from '@koa/router';

export const app = new Koa();
const router = new Router();

router.get('/', (ctx) => {
    ctx.body = 'terragrids store';
});

app
    .use(router.routes())
    .use(router.allowedMethods());