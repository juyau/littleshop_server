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
