'use strict'

import dotenv from 'dotenv'
import Koa from 'koa'
import Router from '@koa/router'

dotenv.config()
export const app = new Koa()
const router = new Router()

router.get('/', (ctx) => {
    ctx.body = 'terragrids api'
})

router.get('/hc', (ctx) => {
    ctx.body = {
        env: process.env.ENV,
        region: process.env.AWS_REGION
    }
})

app
    .use(router.routes())
    .use(router.allowedMethods())