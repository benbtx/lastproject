import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

export = Popup;

class Popup extends BaseWidget {
    baseClass = "widget-popup";

    startup() {
        // this.setHtml(this.template);
        this.setHtml(_.template(this.template)(), ".body");
        this.AppX.runtimeConfig.popup = new popup(this.domObj);
        this.ready();
    }
}

class popup {
    domObj: JQuery;
    backgObj: JQuery;
    titObj: JQuery;
    contentObj: JQuery;
    contentconObj: JQuery;
    contentbtnObj: JQuery;
    btnsubmitObj: JQuery;
    btncloseObj: JQuery;
    popupList: Array<string> = new Array();
    isPopuping: boolean = false;
    lastPopup: string = "";
    /** 配置型变量 */
    deepHeight: string = "-90px";
    hangHeight: string = "15px";

    backgroundClass: string = ".background";
    titClass: string = ".tit";
    contentClass: string = ".content";
    contentconClass: string = ".content-con";
    contentbtnClass: string = ".content-btn";
    btnsubmitClass: string = ".btn-submit";
    btncloseClass: string = ".btn-close";

    /** 配置型变量 */
    toastList: Array<string> = new Array();
    isToasting: boolean = false;
    lastToast: string = "";
    tipdeepHeight: string = "-70px";
    tiphangHeight: string = "0px";
    tipcontentClass: string = ".tipcontent";
    tipPopupClass: string = ".popuptip";
    tipPopupObj: JQuery;
    tipcontentObj: JQuery;

    constructor(domObj: JQuery) {
        this.domObj = domObj;
        this.backgObj = domObj.find(this.backgroundClass);
        this.titObj = domObj.find(this.titClass);
        this.contentObj = domObj.find(this.contentClass);
        this.contentconObj = domObj.find(this.contentconClass);
        this.contentbtnObj = domObj.find(this.contentbtnClass);
        this.btnsubmitObj = domObj.find(this.btnsubmitClass);
        this.tipPopupObj = domObj.find(this.tipPopupClass);
        this.tipcontentObj = domObj.find(this.tipcontentClass);
        this.btncloseObj = domObj.find(this.btncloseClass);
        this.initEvent();
    }

    Show(tit?: string, con?: string, onlywithtitle?: boolean) {
        // 排除无参数的情况
        if (!tit) {
            return;
        }
        if (!con) {
            return;
        }

        // 将消息压入栈
        this.popupList.push(tit);

        // 状态认定
        if (this.isPopuping) {
            return;
        } else {
            this.isPopuping = true;
        }

        this.uiControl(tit, con);
        //true，去掉按钮，变成只带标题的弹出框
        if (onlywithtitle == true) {

            this.contentbtnObj.hide();
            // this.contentbtnObj.height(0);

            // this.btncloseObj.hide();
            // this.btnsubmitObj.hide();
        } else {

            this.contentbtnObj.show();

        }
        return { domObj: this.domObj, conObj: this.contentObj, submitObj: this.btnsubmitObj };
    }
    Close() {
        this.domObj.animate({ bottom: this.deepHeight },
            150,
            this.uiControl.bind(this));
    }
    setSize(width?, height?) {
        this.contentObj.width(width);
        this.contentObj.height(height);
        this.contentObj.css({ "left": "calc(50% - " + width / 2 + "px)" });
        this.contentObj.css({ "bottom": "calc(50% - " + height / 2 + "px)" });
        // this.contentconObj.width(width - 10 + 'px');
        this.contentconObj.height(height - 110 + 'px');
        if (height <= 800) {
            //去除滚动条
            // this.contentconObj.css("overflow", "auto");


        }
        var m = width * 0.25;
        this.tipPopupObj.css({ "left": "calc(50% - " + (width / 2 - m) + "px)" });
        this.tipPopupObj.css({ "bottom": "calc(50% + " + (height / 2 - 70) + "px)" });
    }
    uiControl(tit, con) {
        var tit = this.getStackedMessage();
        if (tit !== "") {
            // this.contentObj.text(message);
            this.titObj.text(tit);
            this.contentconObj.empty();
            this.contentconObj.append(con);
            this.btnsubmitObj.text("确认");
            this.btncloseObj.text("关闭");
            // 显示界面
            this.domObj.show();
            this.domObj.animate({ bottom: this.hangHeight }, 150, function () {
                // setTimeout(function () {
                //     this.domObj.animate({ bottom: this.deepHeight },
                //         150,
                //         this.uiControl.bind(this));
                // }.bind(this), 2000);

            }.bind(this));
        } else {
            this.domObj.hide();
            //解决页面隐藏，audio仍然播放问题
            this.contentconObj.empty();
            this.isPopuping = false;
            return;
        }
    }

    // 从消息栈中获取一个与当前不相同的消息
    getStackedMessage() {
        if (this.popupList.length > 0) {

            var nowPopup = this.popupList.shift();

            if (this.lastPopup !== "" && this.lastPopup === nowPopup) {
                return this.getStackedMessage();
            }

            this.lastPopup = nowPopup;
            return this.lastPopup;
        } else {
            this.lastPopup = "";
            return '';
        }
    }

    initEvent() {
        //点击 <div class="background"></div>之外，隐藏弹出框
        this.domObj.find(".background").off("click").on("click", function () {
            // this.domObj.hide();
            this.domObj.animate({ bottom: this.deepHeight },
                150,
                this.uiControl.bind(this));
        }.bind(this))


        this.domObj.find(".btn-hide").off("click").on("click", function () {
            // this.domObj.hide();
            this.domObj.animate({ bottom: this.deepHeight },
                150,
                this.uiControl.bind(this));
        }.bind(this))

        this.domObj.find(".btn-close").off("click").on("click", function () {
            // this.domObj.hide();
            this.domObj.animate({ bottom: this.deepHeight },
                150,
                this.uiControl.bind(this));
        }.bind(this))


        //解决ESC取消键
        // $(this.domObj).keydown(function (event) {
        //     if (event.keyCode == 27) {//esc

        //         this.domObj.animate({ bottom: this.deepHeight },
        //             150,
        //             this.uiControl.bind(this));
        //     }

        // }.bind(this));

        $(document).keydown(function (event) {
            // .viewer-container有.viewer-in则当前显示状态，有viewer-hide则隐藏状态
            if (this.domObj.css("display") == "none") {
                return;//只有当当前popu显示时才能esc退出
            }
            if ($("td .viewer-container").hasClass("viewer-hide") || $("td .viewer-container").length == 0) {
                if (event.keyCode == 27) {//esc

                    this.domObj.animate({ bottom: this.deepHeight },
                        150,
                        this.uiControl.bind(this));
                }
            }


        }.bind(this));


    }

    ShowMessage(tit?: string, con?: string) {
        // 排除无参数的情况
        if (!tit) {
            return;
        }
        if (!con) {
            return;
        }

        // 将消息压入栈
        this.popupList.push(tit);

        // 状态认定
        if (this.isPopuping) {
            return;
        } else {
            this.isPopuping = true;
        }

        this.contentbtnObj.show();

        this.uiMessageControl(tit, con, "是", "否");
        return { domObj: this.domObj, conObj: this.contentObj, submitObj: this.btnsubmitObj };
    }

    uiMessageControl(tit, con, btnOK, btnCancel) {
        var tit = this.getStackedMessage();
        if (tit !== "") {
            this.titObj.text(tit);
            this.contentconObj.empty();
            this.contentconObj.append("<div style='margin: 10px;text-align: center;vertical-align: middle;'>" + con + "</div>");
            this.btnsubmitObj.text(btnOK);
            this.btncloseObj.text(btnCancel);
            // 显示界面
            this.domObj.show();
            this.domObj.animate({ bottom: this.hangHeight }, 150, function () {

            }.bind(this));
        } else {
            this.domObj.hide();
            this.isPopuping = false;
            return;
        }
    }

    //显示提示消息
    ShowTip(message?: string) {
        // 排除无参数的情况
        if (!message) {
            return;
        }

        // 将消息压入栈
        this.toastList.push(message);

        // 状态认定
        if (this.isToasting) {
            return;
        } else {
            this.isToasting = true;
        }
        this.uitipControl();
    }

    uitipControl() {
        var message = this.getTipStackedMessage();
        if (message !== "") {
            this.tipcontentObj.text(message);
            // 显示界面
            this.tipPopupObj.show();
            this.tipdeepHeight = this.tipPopupObj.css("bottom");
            this.tiphangHeight = this.tipPopupObj.css("bottom");
            console.log(this.tipdeepHeight + "===" + this.tiphangHeight);
            this.tipPopupObj.animate({ bottom: this.tipdeepHeight }, 150, function () {
                setTimeout(function () {
                    this.tipPopupObj.animate({ bottom: this.tiphangHeight },
                        150,
                        this.uitipControl.bind(this));
                }.bind(this), 1000);
            }.bind(this));
        } else {
            this.tipPopupObj.hide();
            this.isToasting = false;
            return;
        }
    }

    // 从消息栈中获取一个与当前不相同的消息
    getTipStackedMessage() {
        if (this.toastList.length > 0) {

            var nowToast = this.toastList.shift();

            if (this.lastToast !== "" && this.lastToast === nowToast) {
                return this.getTipStackedMessage();
            }

            this.lastToast = nowToast;
            return this.lastToast;
        } else {
            this.lastToast = "";
            return '';
        }
    }
}