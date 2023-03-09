import { TokenInvalidError } from '../error/token-invalid-error.js'
import Logger from '../logging/logger.js'
import JwtRepository from '../repository/jwt.repository.js'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'
import JwksFetchError from '../error/jwks-fetch.error.js'
import fetch from 'node-fetch'

export default async function jwtAuthorize(ctx, next) {
    const wellknownEndpoint = `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`
    try {
        const header = ctx.headers?.authorization?.split(' ')
        if (header?.length !== 2) throw new TokenInvalidError()
        const token = header[1]

        let jwks
        const jwksRepository = new JwtRepository()
        let cachedJwks = await jwksRepository.getJwks()

        if (!cachedJwks) {
            const response = await fetch(wellknownEndpoint)
            if (!response.ok) throw new JwksFetchError()

            const json = await response.json()
            jwks = json.keys

            const base64Jwks = Buffer.from(JSON.stringify(jwks)).toString('base64')
            await jwksRepository.putJwks(base64Jwks)
        } else {
            jwks = JSON.parse(Buffer.from(cachedJwks, 'base64').toString('ascii'))
        }

        let jwtToken
        for (let i = 0; i < 2; i++) {
            try {
                jwtToken = jwt.verify(token, jwkToPem(jwks[i]), {
                    issuer: `${process.env.AUTH0_ISSUER_BASE_URL}/`,
                    algorithms: [jwks[i].alg]
                })
                break
            } catch (e) {
                // ignore
            }
        }

        if (!jwtToken) throw new TokenInvalidError()
        ctx.state.jwt = jwtToken
    } catch (e) {
        new Logger().error(e.toString())
        ctx.status = 401
        return
    }
    await next()
}
