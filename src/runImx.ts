import {AlchemyProvider} from '@ethersproject/providers';
import axios from 'axios/index';
import {Wallet} from '@ethersproject/wallet';
import {ERC721TokenType, ETHTokenType, ImmutableMethodParams, ImmutableXClient} from "@imtbl/imx-sdk";
import {BigNumber} from "@ethersproject/bignumber";

const provider = new AlchemyProvider('mainnet', '0BZjuaH8NIoewLDSzZRTiRPav7IhD8rT');

(async (): Promise<void> => {
    const privateKey = 'b308b359c28af946492378c7e8e86e83777b4382ec553ec64ffeaac8e9a153a6'
    const publicKey = '0x42b40a7448251F4AB31b4854bb7146E80fdf1574'

    const signer = new Wallet(privateKey).connect(provider)

    const user = await ImmutableXClient.build({
        publicApiUrl: 'https://api.x.immutable.com/v1',
        starkContractAddress: '0x5FDCCA53617f4d2b9134B29090C87D01058e27e9',
        registrationContractAddress: '0x72a06bf2a1CE5e39cBA06c0CAb824960B587d64c',
        signer: signer,
    });

    let endpoint = 'https://api.x.immutable.com/v1/orders?include_fees=true&status=active&sell_token_address=0x9e0d99b864e1ac12565125c5a82b59adea5a09cd&direction=asc&buy_token_address=0xf57e7e7c23978c3caec3c3548e3d615c346e79ff&order_by=buy_quantity&direction=asc&page_size=2'

    await axios.get(endpoint)
        .then(response => {
            let result = response.data.result

            // @ts-ignore
            if (result === []) {
                console.log(new Date().toLocaleString() + 'Any result in IMX')

                process.exit(0)
            }

            let floor = result[0]
            let quantityFloor = floor.buy.data.quantity
            let decimalsFloor = floor.buy.data.decimals
            let priceFloor = quantityFloor / Math.pow(10, decimalsFloor)

            let tokenId = floor.sell.data.token_id
            let orderId = floor.order_id

            let floorSecond = result[1]
            let quantityFloorSecond = floorSecond.buy.data.quantity
            let decimalsFloorSecond = floorSecond.buy.data.decimals
            let priceFloorSecond = quantityFloorSecond / Math.pow(10, decimalsFloorSecond)
            let halfPriceFloorSecond = priceFloorSecond / 2


            if (priceFloor < halfPriceFloorSecond) {
                console.log('------------------------')
                console.log(new Date().toLocaleString() + ' --- Something to buy')
                console.log('------------------------')

                const data = {
                    "user": publicKey,
                    "token_sell": {
                        "type": "ETH",
                        "data": {
                            "decimals": 18
                        }
                    },
                    "amount_sell": quantityFloor.toString(),
                    "token_buy": {
                        "type": "ERC721",
                        "data": {
                            "token_id": tokenId,
                            "token_address": '0x9e0d99b864e1ac12565125c5a82b59adea5a09cd'
                        }
                    },
                    "amount_buy": "1",
                    "include_fees": true
                }

                axios.post('https://api.x.immutable.com/v1/signable-order-details', data)
                    .then(response => {
                        const payload: ImmutableMethodParams.ImmutableGetSignableTradeParamsTS = {
                            user: publicKey,
                            amountBuy: BigNumber.from('1'),
                            amountSell: BigNumber.from(quantityFloor.toString()),
                            include_fees: true,
                            orderId: orderId,
                            expiration_timestamp: response.data.expiration_timestamp,
                            tokenBuy: {
                                type: ERC721TokenType.ERC721,
                                data: {
                                    tokenId: tokenId,
                                    tokenAddress: '0x9e0d99b864e1ac12565125c5a82b59adea5a09cd'
                                }
                            },
                            tokenSell: {
                                type: ETHTokenType.ETH,
                                data: {
                                    decimals: 18
                                }
                            }
                        };
                        user.createTrade(payload).then(result => {
                            console.log(result);
                        })
                    }).catch(error => {
                    console.log(error.message);
                });
            } else {
                console.log(new Date().toLocaleString() + ' --- Nothing to buy in IMX')
            }
        })
        .catch(error => {
            console.log(error)
        });

})().catch(e => {
    console.log(e);
});