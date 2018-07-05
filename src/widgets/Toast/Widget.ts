import BaseWidget = require('core/BaseWidget.class');

export = Toast;

class Toast extends BaseWidget {
    baseClass = "widget-toast";

    startup() {
        this.setHtml(this.template);
        this.AppX.runtimeConfig.toast = new toast(this.domObj);
        this.ready();
    }
}

class toast {
    domObj: JQuery;
    contentObj: JQuery;
    toastList: Array<any> = new Array();
    isToasting: boolean = false;
    lastToast: string = "";
    /** 配置型变量 */
    deepHeight: string = "-90px";
    hangHeight: string = "15px";
    contentClass: string = ".content";
    defaultTimeout = 2000;

    constructor(domObj: JQuery) {
        this.domObj = domObj;
        this.contentObj = domObj.find(this.contentClass);
        this.domObj.find('.close').on('click', function () {
            this.domObj.animate({ bottom: this.deepHeight },
                150,
                this.uiControl.bind(this));
        }.bind(this));
    }

    Show(message?: string, timeout?: number) {
        // 排除无参数的情况
        if (!message) {
            return;
        }
        if (!timeout)
            timeout = this.defaultTimeout;
        // 将消息压入栈
        this.toastList.push({ message: message, timeout: timeout });

        // 状态认定
        if (this.isToasting) {
            return;
        } else {
            this.isToasting = true;
        }

        this.uiControl();
    }

    uiControl() {
        var message = this.getStackedMessage();
        if (message !== "") {
            this.contentObj.text(message.message);
            // 显示界面
            this.domObj.show();
            this.domObj.animate({ bottom: this.hangHeight }, 150, function () {
                setTimeout(function () {
                    this.domObj.animate({ bottom: this.deepHeight },
                        900,
                        this.uiControl.bind(this));
                }.bind(this), message.timeout);
            }.bind(this));
        } else {
            this.domObj.hide();
            this.isToasting = false;
            return;
        }
    }

    // 从消息栈中获取一个与当前不相同的消息
    getStackedMessage() {
        if (this.toastList.length > 0) {

            var nowToast = this.toastList.shift();

            if (this.lastToast !== "" && this.lastToast === nowToast) {
                return this.getStackedMessage();
            }

            this.lastToast = nowToast;
            return this.lastToast;
        } else {
            this.lastToast = "";
            return '';
        }
    }
}