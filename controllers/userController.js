const bcrypt = require('bcryptjs') 
const db = require('../models')
const User = db.User

const imgur = require('imgur-node-api')
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID
const helpers = require('../_helpers')

const userController = {
  signUpPage: (req, res) => {
    return res.render('signup')
  },

  signUp: (req, res) => {
    // confirm password
    if(req.body.passwordCheck !== req.body.password){
      req.flash('error_messages', '兩次密碼輸入不同！')
      return res.redirect('/signup')
    } else {
      // confirm unique user
      User.findOne({where: {email: req.body.email}}).then(user => {
        if(user){
          req.flash('error_messages', '信箱重複！')
          return res.redirect('/signup')
        } else {
          User.create({
            name: req.body.name,
            email: req.body.email,
            password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10), null)
          }).then(user => {
            req.flash('success_messages', '成功註冊帳號！')
            return res.redirect('/signin')
          })  
        }
      })    
    }
  },
  
  signInPage: (req, res) => {
   return res.render('signin')
  },

  signIn: (req, res) => {
   req.flash('success_messages', '成功登入！')
   res.redirect('/restaurants')
  },

  logout: (req, res) => {
   req.flash('success_messages', '登出成功！')
   req.logout()
   res.redirect('/signin')
  },

  getUser: (req, res) => {
    User.findByPk(req.params.id)
      .then(user => {
        return res.render('profile', { user: user.toJSON() })
      })
  },

  editUser: (req, res) => {
    if (String(helpers.getUser(req).id) !== req.params.id) {
      req.flash('error_messages', '無法編輯其他使用者的資料')
      return res.redirect(`/users/${req.user.id}`)
    }
    
    User.findByPk(req.params.id)
      .then(user => {
        return res.render('editProfile', { user: user.toJSON() })
      })
  },

  putUser: (req, res) => {
    if (!req.body.name) {
      req.flash('error_messages', '使用者名稱為必填資訊！')
      return res.redirect('back')
    }

    const { file } = req
    if (file) {
      imgur.setClientID(IMGUR_CLIENT_ID)
      imgur.upload(file.path, (err, img) => {
        if (err) console.log(`Error: ${err}`)
        return User.findByPk(req.params.id).then(user => {
          user.update({
            name: req.body.name,
            image: file ? img.data.link : user.image
          }).then(() => {
            req.flash('success_messages', '已成功修改使用者資料')
            res.redirect(`/users/${req.params.id}`)
          })
        })
      })
    } else {
      return User.findByPk(req.params.id).then(user => {
        user.update({
          name: req.body.name,
          image: user.image
        })
          .then(() => {
            req.flash('success_messages', '已成功修改使用者資料')
            res.redirect(`/users/${req.params.id}`)
          })
      })
    }
  }
}

module.exports = userController