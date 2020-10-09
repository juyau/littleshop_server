const formidable = require("formidable");
const fs = require("fs");
const _ = require("lodash");

const Product = require("../models/product");

exports.productById = (req, res, next, id) => {
  console.log("inside productById.");
  Product.findById(id).exec((err, product) => {
    if (err || !product) {
      return res.status(400).json({
        error: "Product not found.",
      });
    }
    req.product = product;
    next();
  });
};

exports.read = (req, res) => {
  // photo is to big to send, will send separately when needed;
  console.log("inside read method.");
  req.product.photo = undefined;
  return res.json(req.product);
};

exports.create = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image cound not be uploaded.",
      });
    }

    const { name, description, price, category, quantity, shipping } = fields;

    if (
      !name ||
      !description ||
      !price ||
      !category ||
      !quantity ||
      !shipping
    ) {
      return res.status(400).json({
        error: "All fields are required.",
      });
    }
    let product = new Product(fields);

    if (files.photo) {
      if (files.photo.size >= 500000) {
        return res.status(400).json({
          error: "Image size should be less than 50k.",
        });
      }
      product.photo.data = fs.readFileSync(files.photo.path);
      product.photo.contentType = files.photo.type;
    }
    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }

      res.json(product);
    });
  });
};

exports.remove = (req, res) => {
  let product = req.product;
  product.remove((err, deletedProduct) => {
    if (err) {
      return res.status(400).json({
        error: err,
      });
    }

    res.json({
      deletedProduct,
      message: "Product deleted successfully",
    });
  });
};

exports.update = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image cound not be uploaded.",
      });
    }

    const { name, description, price, category, quantity, shipping } = fields;

    if (
      !name ||
      !description ||
      !price ||
      !category ||
      !quantity ||
      !shipping
    ) {
      return res.status(400).json({
        error: "All fields are required.",
      });
    }
    //   let product = new Product(fields);

    // lodash extend function, adds in or replace the old data;
    console.log(req.product);
    let product = req.product;
    product = _.extend(product, fields);

    // check file size
    if (files.photo) {
      if (files.photo.size >= 500000) {
        return res.status(400).json({
          error: "Image size should be less than 50k.",
        });
      }
      product.photo.data = fs.readFileSync(files.photo.path);
      product.photo.contentType = files.photo.type;
    }
    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }

      res.json(result);
    });
  });
};

/**
 * product list can be sort by number of sell or new arrival
 * by sell = /products?sortBy=sold&order=desc&limit=4
 * by arrival = /products?sortBy=createdAt&order=desc&limit=4
 * if no params are sent, then return all products using default
 */

exports.list = (req, res) => {
  let order = req.query.order ? req.query.order : "asc";
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  let limit = req.query.limit ? parseInt(req.query.limit) : 2;

  Product.find()
    .select("-photo") //use - to deselect from the fields, photo is big and not needed;
    .populate("category")
    .sort([[sortBy, order]])
    .limit(limit)
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }

      res.json(products);
    });
};
/**
 *
 * 1. find which category the product is in
 * 2. return the products that are in the same category.
 */
exports.listRelated = (req, res) => {
  let limit = req.query.limit ? parseInt(req.query.limit) : 4;

  Product.find({
    category: req.product.category,
    _id: { $ne: req.product._id },
  })
    .select("-photo")
    .limit(limit)
    .populate("category", "_id name price")
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }

      res.json(products);
    });
};

exports.listCategories = (req, res) => {
  Product.distinct("category", (err, result) => {
    if (err) {
      return res.status(400).json({
        error: err,
      });
    }

    res.json(result);
  });
};

exports.listBySearch = (req, res) => {
  let order = req.body.order ? req.body.order : "asc";
  let sortBy = req.body.sortBy ? req.body.sortBy : "_id";
  let limit = req.body.limit ? parseInt(req.body.limit) : 100;
  let skip = parseInt(req.body.skip);
  let findArgs = {}; // arguments to the mongoose search filter;

  for (let key in req.body.filters) {
    console.log(`inside for filters:  ${key}`);

    if (req.body.filters[key].length > 0) {
      // gte - price range started from, lte - price range end at;
      if (key === "price") {
        findArgs[key] = {
          $gte: req.body.filters[key][0],
          $lte: req.body.filters[key][1],
        };
      }
    }

    findArgs[key] = req.body.filters[key];
    // console.log(`inside else:  ${findArgs}`);
  }

  console.log(findArgs);

  Product.find(findArgs)
    .select("-photo") //use - to deselect from the fields, photo is big and not needed;
    .populate("category")
    .sort([[sortBy, order]])
    .skip(skip)
    .limit(limit)
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found.",
        });
      }

      res.json({
        size: data.length,
        data,
      });
    });
};
