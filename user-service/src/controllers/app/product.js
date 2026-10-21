const Product = require("../../models/Product");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const {
  getProductByIdValidation,
} = require("../../services/productValidation");
const {
  configuredSaleQuery,
  presentProduct,
} = require("../../services/productPricing");

const HOME_PRODUCT_FIELDS = "name slug description shortDescription thumbnail screenshots images price discountPrice discountPercentage isDiscountActive releaseDate averageRating reviewCount tags genres platform developer publisher category";
const DETAIL_PRODUCT_FIELDS = "name slug description shortDescription matureContentDescription metascore achievementCount featureHighlights supportedFeatures languageSupport price discountPrice discountPercentage isDiscountActive thumbnail category releaseDate developer publisher genres tags images videos screenshots systemRequirements ageRating averageRating reviewCount";

module.exports = {
  /**
   * @description This function is used to get product by ID
   * @param req
   * @param res
   */
  getProductById: async (req, res) => {
    try {
      const productId = req.params.id || req.query.id;

      if (!productId) {
        return Response.errorResponseData(
          res,
          "Product ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      getProductByIdValidation(req, res, async (validate) => {
        if (validate) {
          const product = await Product.findById(productId);

          if (!product) {
            return Response.errorResponseWithoutData(
              res,
              "Product not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          // Only show active products to non-admin users
          {
            if (!product.isActive) {
              return Response.errorResponseWithoutData(
                res,
                "Product not found",
                Constant.STATUS_CODES.PAGE_NOT_FOUND
              );
            }
          }

          return Response.successResponseData(
            res,
            presentProduct(product),
            Constant.STATUS_CODES.SUCCESS,
            "Product found"
          );
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  getProductBySlug: async (req, res) => {
    try {
      const product = await Product.findOne({
        slug: req.params.slug,
        isActive: true,
      }).select(DETAIL_PRODUCT_FIELDS);
      if (!product) {
        return Response.errorResponseWithoutData(
          res,
          "Product not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      }

      return Response.successResponseData(
        res,
        presentProduct(product),
        Constant.STATUS_CODES.SUCCESS,
        "Product found"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get all products with filters, search, and pagination
   * @param req
   * @param res
   */
  getAllProducts: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        genre,
        minPrice,
        maxPrice,
        platform,
        sortBy = "createdAt",
        sortOrder = "desc",
        featured,
        onSale,
      } = req.query;

      const query = {};

      // Only show active products to non-admin users
      {
        query.isActive = true;
      }

      // Search functionality
      if (search) {
        query.$text = { $search: search };
      }

      // Filter by genre
      if (genre) {
        query.genres = { $in: [genre] };
      }

      // Filter by price range
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      // Filter by platform
      if (platform) {
        query.platform = { $in: [platform] };
      }

      // Filter featured products
      if (featured === "true") {
        query.isFeatured = true;
      }

      // Filter on sale products
      if (onSale === "true") {
        Object.assign(query, configuredSaleQuery);
      }

      // Sort options
      const sortOptions = {};
      if (sortBy === "price") {
        sortOptions.price = sortOrder === "asc" ? 1 : -1;
      } else if (sortBy === "releaseDate") {
        sortOptions.releaseDate = sortOrder === "asc" ? 1 : -1;
      } else if (sortBy === "rating") {
        sortOptions.averageRating = sortOrder === "asc" ? 1 : -1;
      } else {
        sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const products = await Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v");

      const totalProducts = await Product.countDocuments(query);

      return Response.successResponseData(
        res,
        {
          products: products.map((product) => presentProduct(product)),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / parseInt(limit)),
            totalProducts,
            limit: parseInt(limit),
          },
        },
        Constant.STATUS_CODES.SUCCESS,
        "Products retrieved successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get featured products
   * @param req
   * @param res
   */
  getFeaturedProducts: async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const query = { isFeatured: true, isActive: true };

      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select(HOME_PRODUCT_FIELDS);

      return Response.successResponseData(
        res,
        products.map((product) => presentProduct(product)),
        Constant.STATUS_CODES.SUCCESS,
        "Featured products retrieved successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get products on sale
   * @param req
   * @param res
   */
  getProductsOnSale: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const query = {
        isActive: true,
        ...configuredSaleQuery,
      };

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const products = await Product.find(query)
        .sort({ discountPercentage: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("name slug thumbnail price discountPrice discountPercentage isDiscountActive releaseDate platform category tags genres averageRating reviewCount");

      const totalProducts = await Product.countDocuments(query);

      return Response.successResponseData(
        res,
        {
          products: products.map((product) => presentProduct(product)),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / parseInt(limit)),
            totalProducts,
            limit: parseInt(limit),
          },
        },
        Constant.STATUS_CODES.SUCCESS,
        "Products on sale retrieved successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  getRecentlyCreatedProducts: async (req, res) => {
    try {
      const { page = 1, limit = 100 } = req.query;
      const daysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const query = { isActive: true, createdAt: { $gte: daysAgo } };
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select(HOME_PRODUCT_FIELDS);
      const totalProducts = await Product.countDocuments(query);
      return Response.successResponseData(
        res,
        {
          products: products.map((product) => presentProduct(product)),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / parseInt(limit)),
            totalProducts,
            limit: parseInt(limit),
          },
        },
        Constant.STATUS_CODES.SUCCESS,
        "Recently created products retrieved successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get new releases
   * @param req
   * @param res
   */
  getNewReleases: async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      const query = { isActive: true };

      const products = await Product.find(query)
        .sort({ releaseDate: -1 })
        .limit(parseInt(limit))
        .select("-__v");

      return Response.successResponseData(
        res,
        products.map((product) => presentProduct(product)),
        Constant.STATUS_CODES.SUCCESS,
        "New releases retrieved successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get all genres
   * @param req
   * @param res
   */
  getAllGenres: async (req, res) => {
    try {
      const products = await Product.find({ isActive: true }).select("genres");
      const genresSet = new Set();

      products.forEach((product) => {
        if (product.genres && product.genres.length > 0) {
          product.genres.forEach((genre) => genresSet.add(genre));
        }
      });

      const genres = Array.from(genresSet).sort();

      return Response.successResponseData(
        res,
        genres,
        Constant.STATUS_CODES.SUCCESS,
        "Genres retrieved successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};
