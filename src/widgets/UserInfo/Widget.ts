import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');



export = userInfo;

class userInfo extends BaseWidget {
    baseClass = "userInfo";

    startup() {
        this.ready();
        this.setHtml(this.template);

        this.userInfoInit();
    }
    userInfoInit() {
        this.domObj.find(".avatar").bind("click", this.avatarClick.bind(this));
        this.domObj.find(".modifyPassword").bind("click", this.showModifyPassword.bind(this));
        this.domObj.find(".cancel").bind("click", this.hideModifyPassword.bind(this));
    }
    avatarClick() {
        var visibility = this.domObj.find(".hidded").css("display");
        if (visibility != "none") {
            this.domObj.find(".hidded").css({ display: "none" });

        } else {
            this.domObj.find(".hidded").css({ display: "block" });
        }

        var display = this.domObj.find(".modify").css("display");
        if (display != "none") {
            this.domObj.find(".modify").css("display", "none");
        }

    }
    showModifyPassword() {
        this.domObj.find(".modify").show();
    }
    hideModifyPassword() {
        this.domObj.find(".modify").hide();
    }
}
