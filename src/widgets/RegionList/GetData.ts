export function getList(url, data, callback) {
    $.ajax({
        headers: {
            'Authorization-Token': AppX.appConfig.usertoken
        },
        data: data,
        type: 'post',
        url: url,
        success: callback
    });
}