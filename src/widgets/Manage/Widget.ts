import BaseWidget = require("core/BaseWidget.class");

export = Manage;

declare var Cookies

class Manage extends BaseWidget {
    startup() {
        Cookies.set('region', '');
        location.reload();
    }
}
