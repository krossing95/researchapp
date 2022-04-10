require("isomorphic-fetch");
require("es6-promise").polyfill();

module.exports = {
    botChecker: async (request, captchaCode, next) => {
        const isHuman = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
            method: "post",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
            },
            body: `secret=${process.env.RECAPTCHA_SECRET}&response=${captchaCode}`
        }).then(response => response.json()).then(json => json.success)
            .catch(err => {
                return
            });
        if (captchaCode === null || !isHuman) {
            return request.res.status(412).json({error: 'Bot action detected'});
        }

        return next();
    }
}