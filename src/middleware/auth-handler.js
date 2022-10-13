import { verify } from '@noble/ed25519'
import algosdk from 'algosdk'
import { TokenInvalidError } from '../error/token-invalid-error.js'
import { day1, minutes30 } from '../utils/constants.js'
import { TokenExpiredError } from '../error/token-expired-error.js'

export default async function authHandler(ctx, next) {
    let toCheck
    let signature
    let decodedNote
    let from
    let to

    const { wallet } = ctx.query
    const token = ctx.headers?.authorization?.split(' ')
    if (token?.length !== 2) throw new TokenInvalidError()

    try {
        const decodeToken = new Uint8Array(Buffer.from(token[1], 'base64'))
        const decodedTx = algosdk.decodeSignedTransaction(decodeToken)
        toCheck = decodedTx.txn
        signature = decodedTx.sig
        const note = new TextDecoder().decode(toCheck.note)
        decodedNote = note.split(' ')
        from = algosdk.encodeAddress(toCheck.from.publicKey)
        to = algosdk.encodeAddress(toCheck.to.publicKey)
    } catch (e) {
        throw new TokenInvalidError()
    }

    if (Number(decodedNote[1]) < Date.now() || Number(decodedNote[1]) > Date.now() + day1 + minutes30) {
        throw new TokenExpiredError()
    }

    const env = process.env.ENV === 'dev' ? 'testnet' : 'app'
    if (toCheck.firstRound === 10 && toCheck.lastRound === 10 && decodedNote[0] === `https://${env}.terragrids.org/` && from === to && from === wallet) {
        const verified = await verify(signature, toCheck.bytesToSign(), toCheck.from.publicKey)
        if (verified) {
            await next()
            return
        }
    }
    //if not verified throw invalid error
    throw new TokenInvalidError()
}
