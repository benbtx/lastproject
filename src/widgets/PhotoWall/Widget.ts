import BaseWidget = require('core/BaseWidget.class');

export = PhotoWall;

class PhotoWall extends BaseWidget {
    baseClass = "widget-photowall";

    startup() {
        // this.setHtml(this.template);
        this.setHtml(this.template, ".body");
        this.AppX.runtimeConfig.photowall = new photowall(this.domObj);
        this.ready();
    }
}

class photowall {
    domObj: JQuery;
    backgObj: JQuery;
    titObj: JQuery;
    contentObj: JQuery;
    contentconObj: JQuery;
    btnsubmitObj: JQuery;
    photowallList: Array<string> = new Array();
    isPhotoWalling: boolean = false;
    lastPhotoWall: string = "";
    /** 配置型变量 */
    deepHeight: string = "-90px";
    hangHeight: string = "15px";

    backgroundClass: string = ".background";
    titClass: string = ".tit";
    contentClass: string = ".content";
    contentconClass: string = ".content-con";
    btnsubmitClass: string = ".btn-submit";

    constructor(domObj: JQuery) {
        this.domObj = domObj;
        this.backgObj = domObj.find(this.backgroundClass);
        this.titObj = domObj.find(this.titClass);
        this.contentObj = domObj.find(this.contentClass);
        this.contentconObj = domObj.find(this.contentconClass);
        this.btnsubmitObj = domObj.find(this.btnsubmitClass);
        this.initEvent();
    }

    Show(tit?: string, con?: string) {
        // 排除无参数的情况
        if (!tit) {
            return;
        }
        if (!con) {
            return;
        }

        // 将消息压入栈
        this.photowallList.push(tit);

        // 状态认定
        if (this.isPhotoWalling) {
            return;
        } else {
            this.isPhotoWalling = true;
        }

        this.uiControl(tit, con);
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

    }

    uiControl(tit, con) {
        var tit = this.getStackedMessage();
        if (tit !== "") {
            // this.contentObj.text(message);
            this.titObj.text(tit);
            this.contentconObj.empty();
            this.contentconObj.append(con);

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
            this.isPhotoWalling = false;
            return;
        }
    }

    // 从消息栈中获取一个与当前不相同的消息
    getStackedMessage() {
        if (this.photowallList.length > 0) {

            var nowPhotoWall = this.photowallList.shift();

            if (this.lastPhotoWall !== "" && this.lastPhotoWall === nowPhotoWall) {
                return this.getStackedMessage();
            }

            this.lastPhotoWall = nowPhotoWall;
            return this.lastPhotoWall;
        } else {
            this.lastPhotoWall = "";
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


    }
}