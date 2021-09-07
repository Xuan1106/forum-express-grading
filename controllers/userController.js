const bcrypt = require('bcryptjs') 
const db = require('../models')
const User = db.User
const Comment = db.Comment
const Restaurant = db.Restaurant
const Favorite = db.Favorite
const Like = db.Like

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
    const userId = req.params.id
    User.findByPk(userId)
      .then(user => {
        Comment.findAndCountAll({
          raw: true,
          nest: true,
          include: [Restaurant],
          where: { userId: userId }
        })
          .then(results => {
            const data = results.rows.map(r => ({
              ...r,
              restaurantId: r.Restaurant.id,
              restaurantImage: r.Restaurant.image
            }))
            const count = results.count
            return res.render('profile', { user: user.toJSON(), count, comments: data })
          })
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
    if (String(helpers.getUser(req).id) !== req.params.id) {
      req.flash('error_messages', '無法編輯其他使用者的資料')
      return res.redirect(`/users/${req.user.id}`)
    }
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
  },

  addFavorite: (req, res) => {
    return Favorite.create({
      UserId: helpers.getUser(req).id,
      RestaurantId: req.params.restaurantId
    })
      .then((restaurant) => {
        return res.redirect('back')
      })
  },
  
  removeFavorite: (req, res) => {
    return Favorite.findOne({
      where: {
        UserId: helpers.getUser(req).id,
        RestaurantId: req.params.restaurantId
      }
    })
      .then((favorite) => {
        favorite.destroy()
          .then((restaurant) => {
            return res.redirect('back')
          })
      })
  },

  addLike: (req, res) => {
    return Like.create({
      UserId: helpers.getUser(req).id,
      RestaurantId: req.params.restaurantId
    })
      .then(() => {
        return res.redirect('back')
      })
  },
  removeLike: (req, res) => {
    return Like.findOne({
      where: {
        UserId: helpers.getUser(req).id,
        RestaurantId: req.params.restaurantId
      }
    })
      .then(like => {
        like.destroy()
          .then(() => {
            return res.redirect('back')
          })
      })
  },

  getTopUser: (req, res) => {
    return User.findAll({
      include: [
        { model: User, as: 'Followers' }
      ]
    }).then(users => {
      users = users.map(user => ({
        ...user.dataValues,
        FollowerCount: user.Followers.length,
        isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(user.id)
      }))
      users = users.sort((a, b) => b.FollowerCount - a.FollowerCount)
      return res.render('topUser', { users: users })
    })
  }
}

module.exports = userController