const allowedTitles = ['Mr.', 'Mrs.', 'Miss', 'Dr.', 'Prof.'];
const allowedGender = ['Male', 'Female', 'Other'];
const passwordRegex =  /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,100}$/;
const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const alphaRegex = /^[a-zA-Z ]*$/;

module.exports = {
    create: (data, next) => {
        const { firstname, lastname, email, phone, password, password_confirmation, gender, title } = data;

        if (!firstname.length || !lastname.length || !email.length || !phone.length || !password.length || !gender.length || !title.length) {
            return { status: true, error: 'All fields are required' }
        } else if ((firstname.length <3 || firstname.length >30) || (lastname.length <3 || lastname.length >30)) {
            return { status: true, error: 'Names should not be less than 3 or more than 30 chars' }
        } else if (Number(phone) * 1 !== Number(phone)) {
            return { status: true, error: 'Phone must be a numeric string' }
        } else if (phone.length !==10) {
            return { status: true, error: 'Phone must be a 10 digits number' }
        } else if (password.length < 8) {
            return { status: true, error: 'Password must be at least 8 chars' }
        } else if (password !== password_confirmation) {
            return { status: true, error: 'Passwords do not match' }
        } else{
            if (!password.match(passwordRegex)) {
                return { status: true, error: 'Password must contain numbers and special chars' }
            } else if (!email.match(emailRegex)) {
                return { status: true, error: 'Incorrect email address' }
            } else if (!allowedTitles.includes(title)) {
                return { status: true, error: 'Chosen title was rejected' }
            } else if (!allowedGender.includes(gender)) {
                return { status: true, error: 'Chosen gender was rejected' }
            } else if (!firstname.match(alphaRegex) || !lastname.match(alphaRegex)) {
                return { status: true, error: 'Only English alphabets and whitespace are allowed in names' }
            }

            return next();
        }
    },
    passwordValidate: (password, password_confirmation, next) => {
        if (password.length < 8) {
            return { status: true, error: 'Password must be at least 8 chars' }
        } else if (password !== password_confirmation) {
            return { status: true, error: 'Passwords do not match' }
        } else{
            if (!password.match(passwordRegex)) {
                return { status: true, error: 'Password must contain numbers and special chars' }
            }
            return next();
        }
    },
    update: (firstname, lastname, email, phone, usertype, story, gender, title, next) => {
        if (firstname.length ===0 || lastname.length ===0 || email.length ===0 || phone.length ===0 || usertype.length ===0 || gender.length ===0 || title.length ===0) {
            return { status: true, error: 'Crucial fields are required' }
        } else if ((firstname.length <3 || firstname.length >30) || (lastname.length <3 || lastname.length >30)) {
            return { status: true, error: 'Names should not be less than 3 or more than 30 chars' }
        } else if (Number(phone) * 1 !== Number(phone)) {
            return { status: true, error: 'Phone must be a numeric string' }
        } else if (phone.length !==10) {
            return { status: true, error: 'Phone must be a 10 digits number' }
        } else {
            if (story.length !==0 && (story.length < 200 || story.length > 10000) ) {
                return { status: true, error: 'Bios must be between the range of 200 - 10000 chars' }
            }
            const typeArray = [ 'User', 'Administrator', 'Block' ];
            if (!typeArray.includes(usertype)) {
                return { status: true, error: 'Selected usertype was rejected' }
            }
            if (!email.match(emailRegex)) {
                return { status: true, error: 'Incorrect email address' }
            }
            if (!allowedTitles.includes(title)) {
                return { status: true, error: 'Chosen title was rejected' }
            } else if (!allowedGender.includes(gender)) {
                return { status: true, error: 'Chosen gender was rejected' }
            } else if (!firstname.match(alphaRegex) || !lastname.match(alphaRegex)) {
                return { status: true, error: 'Only English alphabets and whitespace are allowed in names' }
            }
            return next();
        }
    }
}