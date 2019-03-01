---
title: 綠界支付
date: 2019-03-01 22:24:40
tags:
---

## 前置資訊
綠界支付 , 有開發者測試專用的帳號 & 後台 , 在資料審核期間 , 可用其先行開發

綠界後台相關資訊 : 

```
MerchantID: '2000132', // 特店編號
PlatformID: undefined, // 平台商編號
account: 'StageTest', // 帳號
password: 'test1234', // 密碼
manageUrl: 'https://vendor-stage.ecpay.com.tw', // 廠商管理後台
createAioOrderUrl: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5', // 建立綠界訂單
HashKey: '5294y06JbISpM5x9',
HashIV: 'v77hoKGq4kWxNNIS',
testCreditNo: '4311-9522-2222-2222', // 信用卡測試卡號
testCreditPIN: '222', // 信用卡測試安全碼
testCreditDeadDate: '08/2023', // 信用卡測試安全碼
```

## 付款流程說明

1.使用者在特店WEB上,按下付費按鈕   
2.按鈕呼叫特店API  
3.特店API回傳HTML form , 並用 JS 讓其直接POST到綠界  
4.使用者在綠界頁面執行付款  
5.綠界收到錢後 , POST 到 ReturnURL


特店API回傳HTML form 範例
```html
<form id="_form_aiochk" action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5" method="post">
<input type="hidden" name="TotalAmount" id="TotalAmount" value="1000"/>
<input type="hidden" name="TradeDesc" id="TradeDesc" value="益友服務使用費"/>
<input type="hidden" name="ItemName" id="ItemName" value="藥品諮詢服務"/>
<input type="hidden" name="MerchantMemberID" id="MerchantMemberID" value="andrew13"/>
<input type="hidden" name="MerchantID" id="MerchantID" value="2000132"/>
<input type="hidden" name="MerchantTradeNo" id="MerchantTradeNo" value="UE0301x0000jsq7xone"/>
<input type="hidden" name="MerchantTradeDate" id="MerchantTradeDate" value="2019/03/01 23:29:17"/>
<input type="hidden" name="PaymentType" id="PaymentType" value="aio"/>
<input type="hidden" name="ChoosePayment" id="ChoosePayment" value="Credit"/>
<input type="hidden" name="ReturnURL" id="ReturnURL" value="https://88b2aa41.ngrok.io/ui/ecPay/moneyPaid"/>
<input type="hidden" name="EncryptType" id="EncryptType" value="1"/>
<input type="hidden" name="BindingCard" id="BindingCard" value="1"/>
<input type="hidden" name="CustomField1" id="CustomField1" value="AN0301x0000"/>
<input type="hidden" name="CheckMacValue" id="CheckMacValue" value="E48729708B6CA92DCDD35E20720A7B9BD412D16B60C0FE7000B10E7ED65346E7"/>
<script type="text/javascript">document.getElementById("_form_aiochk").submit();</script>
</form>
```

在測試環境中 , 可用 ngrok 將 ReturnURL 導向到 localhost 上 

NODE.JS 範例
```javascript
async function getReturnURL({path,port}) {
    // const url = await ngrok.connect(9090); // https://757c1652.ngrok.io -> http://localhost:9090
    const rootUrl = await ngrok.connect(port);
    return rootUrl + '/' + path;
}
```

#### NODE.JS 完整範例
```javascript
async function getReturnURL({path,port}) {
    // const url = await ngrok.connect(9090); // https://757c1652.ngrok.io -> http://localhost:9090
    const rootUrl = await ngrok.connect(port);
    return rootUrl + '/' + path;
}

// 參考資料 : https://blog.hoyo.idv.tw/?p=3970
const ecPayUtil = {

    _jsonToFormData(keys, json) {

        let result = '';

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = json[keys[i]];
            result += `${key}=${value}&`;
        }

        return result.substring(0, result.length - 1);
    },

    _getCheckMacValue: (data) => {

        const keys = Object.keys(data);

        const newKeys = keys.sort(function (a, b) {

            return (a > b) ? 1 : -1;
        });

        const aa = ecPayUtil._jsonToFormData(newKeys, data);

        let encoded = encodeURIComponent(`HashKey=${ecpayConfig.hashKey}&${aa}&HashIV=${ecpayConfig.hashIV}`).toLowerCase();

        // replace the escape string
        encoded = encoded.replace(/%20/g, '+');
        encoded = encoded.replace(/~/g, '%7e');
        encoded = encoded.replace(/'/g, '%27');

        const cryptoed = (ecPayUtil._sha2(encoded)).toUpperCase();

        return cryptoed;
    },

    // sha256 hash
    _sha2(string) {
        return crypto.createHash('sha256').update(string).digest('hex');
    },

    getFormData({totalAmount, tradeDesc, itemName, userId, /* merchantTradeNo,*/ merchantTradeDate, orderNo, returnURL}) {

        if (parseInt(totalAmount) < 1) throw 'totalAmount cannot be zero';

        const data = {
            TotalAmount: totalAmount, // 交易金額
            TradeDesc: tradeDesc, // 交易描述
            ItemName: itemName, // 商品名稱 ( # 區隔項目)
            MerchantMemberID: `andrew${userId}`, // 信用卡號識
        };

        const today_str = dateUtil.format({date: new Date(), formatPattern: 'YYYY/MM/DD HH:mm:ss'});
        const MerchantTradeDate = merchantTradeDate || today_str;

        // Note : MerchantTradeNo Must be Number or English Letter. TotalAmount Must bigger than 0
        const tempData = {
            ...data,
            MerchantID: ecpayConfig.merchantID,
            MerchantTradeNo: orderNo + `${new Date().getTime().toString(36)}`, // 綠界訂單編號不能重複
            MerchantTradeDate, // 特 店 交 易 時 間 ( yyyy/MM/dd HH:mm:ss )
            PaymentType: 'aio', // 交易類型 ( 請固定填入 aio )
            ChoosePayment: ecpayConfig.choosePayment, // 選擇預設付款方式 : [ ALL , ATM , CVS , Credit ]
            ReturnURL: returnURL, // ecpayConfig.returnURL, // 付 款 完 成 通知回傳網址 (讓 server 知道付費完成)
            // ClientBackURL: ecpayConfig.clientBackURL, // Client 端返回 特 店 的 按 鈕 連結 (訂單產生後 , 往哪一頁導向)
            EncryptType: 1, // CheckMacValue 加密類型 ( 請固定填入 1，使用 SHA256 加密。 )
            BindingCard: 1, // 記憶卡號 ( 0 : 不使用 , 1 : 使用 )
            CustomField1: orderNo
        };

        const formData = {
            ...tempData,
            CheckMacValue: ecPayUtil._getCheckMacValue(tempData),
        };

        return formData;
    },

    renderRedirectHtml: (data) => {
        const formData = ecPayUtil.getFormData(data);
        return ecPayUtil.renderRedirectHtmlWithFormData(formData);
    },

    // ecpay 只能用使用 html form post 產生訂單
    renderRedirectHtmlWithFormData: (formData) => {

        const keys = Object.keys(formData);

        let formattedStr = '';

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            formattedStr += `<input type="hidden" name="${key}" id="${key}" value="${formData[key]}"/>`;
        }

        return `<form id="_form_aiochk" action="${used.aioCheckOutUrl}" method="post">\n` +
            formattedStr +
            '<script type="text/javascript">document.getElementById("_form_aiochk").submit();</script>\n' +
            '</form>';
    }

};

// 實際使用
const formData = ecPayUtil.getFormData({
    returnURL,
    totalAmount: ecpayOrder.total_amount,  // 總價格
    tradeDesc: ecpayOrder.trade_desc,  // 品項描述
    itemName: ecpayOrder.item_name,   // 品項名稱
    orderNo: ecpayOrder.order_no,    // 特店訂單編號
    merchantTradeDate: ecpayOrder.merchant_trade_date // 交易時間
});

const  postHtml = ecPayUtil.renderRedirectHtmlWithFormData(formData);
```

