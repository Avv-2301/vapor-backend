const Review = require("../../models/Review");
const Product = require("../../models/Product");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const {
  createReviewValidation,
  getReviewByIdValidation,
} = require("../../services/productValidation");

// Helper function to calculate average rating
const calculateAverageRating = async (productId) => {
  const reviews = await Review.find({
    productId,
    isApproved: true,
  });

  if (reviews.length === 0) {
    return { averageRating: 0, reviewCount: 0 };
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  return {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    reviewCount: reviews.length,
  };
};

module.exports = {
  /**
   * @description This function is used to create a review
   * @param req
   * @param res
   */
  createReview: async (req, res) => {
    try {
      const requestParams = req.body;
      const userId = req.authUserId;

      if (!userId) {
        return Response.errorResponseData(
          res,
          "User ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      // Check if product exists
      const product = await Product.findById(requestParams.productId);
      if (!product) {
        return Response.errorResponseWithoutData(
          res,
          "Product not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      }

      // Check if user already reviewed this product
      const existingReview = await Review.findOne({
        productId: requestParams.productId,
        userId: userId,
      });

      if (existingReview) {
        return Response.errorResponseWithoutData(
          res,
          "You have already reviewed this product",
          Constant.STATUS_CODES.DATA_CONFLICT
        );
      }

      createReviewValidation(requestParams, res, async (validate) => {
        if (validate) {
          const reviewObj = {
            productId: requestParams.productId,
            userId: userId,
            rating: requestParams.rating,
            title: requestParams.title || null,
            comment: requestParams.comment,
            isVerifiedPurchase: requestParams.isVerifiedPurchase || false,
          };

          const reviewCreation = await Review.create(reviewObj);

          // Update product's average rating and review count
          const { averageRating, reviewCount } = await calculateAverageRating(
            requestParams.productId
          );
          await Product.findByIdAndUpdate(requestParams.productId, {
            averageRating,
            reviewCount,
          });

          return Response.successResponseData(
            res,
            reviewCreation,
            Constant.STATUS_CODES.CREATED,
            "Review created successfully. It will be visible after admin approval."
          );
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get reviews for a product
   * @param req
   * @param res
   */
  getProductReviews: async (req, res) => {
    try {
      const productId = req.params.productId || req.query.productId;
      const { page = 1, limit = 10, rating } = req.query;

      if (!productId) {
        return Response.errorResponseData(
          res,
          "Product ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      const query = {
        productId,
        isApproved: true, // Only show approved reviews
      };

      // Filter by rating if provided
      if (rating) {
        query.rating = parseInt(rating);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const reviews = await Review.find(query)
        .sort({ helpfulCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v")
        .populate("userId", "name email") // Populate user info if needed
        .lean();

      // Remove userId details for privacy (or keep if needed)
      const sanitizedReviews = reviews.map((review) => {
        const { userId, ...rest } = review;
        return rest;
      });

      const totalReviews = await Review.countDocuments(query);

      // Get rating distribution
      const ratingDistribution = await Review.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      return Response.successResponseData(
        res,
        {
          reviews: sanitizedReviews,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalReviews / parseInt(limit)),
            totalReviews,
            limit: parseInt(limit),
          },
          ratingDistribution,
        },
        Constant.STATUS_CODES.SUCCESS,
        "Reviews retrieved successfully"
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
   * @description This function is used to get a review by ID
   * @param req
   * @param res
   */
  getReviewById: async (req, res) => {
    try {
      const reviewId = req.params.id || req.query.id;

      if (!reviewId) {
        return Response.errorResponseData(
          res,
          "Review ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      getReviewByIdValidation(req, res, async (validate) => {
        if (validate) {
          const review = await Review.findById(reviewId).select("-__v");

          if (!review) {
            return Response.errorResponseWithoutData(
              res,
              "Review not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          // The public user API only exposes approved reviews.
          {
            if (!review.isApproved) {
              return Response.errorResponseWithoutData(
                res,
                "Review not found",
                Constant.STATUS_CODES.PAGE_NOT_FOUND
              );
            }
          }

          return Response.successResponseData(
            res,
            review,
            Constant.STATUS_CODES.SUCCESS,
            "Review found"
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

  /**
   * @description This function is used to update a review (user can update their own review)
   * @param req
   * @param res
   */
  updateReview: async (req, res) => {
    try {
      const reviewId = req.params.id;
      const userId = req.authUserId;
      const requestParams = req.body;

      if (!reviewId) {
        return Response.errorResponseData(
          res,
          "Review ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      if (!userId) {
        return Response.errorResponseData(
          res,
          "User ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      getReviewByIdValidation(req, res, async (validate) => {
        if (validate) {
          const review = await Review.findById(reviewId);

          if (!review) {
            return Response.errorResponseWithoutData(
              res,
              "Review not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          if (review.userId.toString() !== userId) {
            return Response.errorResponseWithoutData(
              res,
              "You can only update your own reviews",
              Constant.STATUS_CODES.FORBIDDEN
            );
          }

          // Update review
          const updateData = {};
          if (requestParams.rating !== undefined)
            updateData.rating = requestParams.rating;
          if (requestParams.title !== undefined)
            updateData.title = requestParams.title;
          if (requestParams.comment !== undefined)
            updateData.comment = requestParams.comment;

          // If review was approved and is being updated, unapprove it for admin review
          if (review.isApproved) {
            updateData.isApproved = false;
          }

          const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            { $set: updateData },
            { new: true, runValidators: true }
          );

          // Recalculate product's average rating
          const { averageRating, reviewCount } = await calculateAverageRating(
            review.productId
          );
          await Product.findByIdAndUpdate(review.productId, {
            averageRating,
            reviewCount,
          });

          return Response.successResponseData(
            res,
            updatedReview,
            Constant.STATUS_CODES.SUCCESS,
            "Review updated successfully"
          );
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to delete a review
   * @param req
   * @param res
   */
  deleteReview: async (req, res) => {
    try {
      const reviewId = req.params.id;
      const userId = req.authUserId;

      if (!reviewId) {
        return Response.errorResponseData(
          res,
          "Review ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      if (!userId) {
        return Response.errorResponseData(
          res,
          "User ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      getReviewByIdValidation(req, res, async (validate) => {
        if (validate) {
          const review = await Review.findById(reviewId);

          if (!review) {
            return Response.errorResponseWithoutData(
              res,
              "Review not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          if (review.userId.toString() !== userId) {
            return Response.errorResponseWithoutData(
              res,
              "You can only delete your own reviews",
              Constant.STATUS_CODES.FORBIDDEN
            );
          }

          const productId = review.productId;

          await Review.findByIdAndDelete(reviewId);

          // Recalculate product's average rating
          const { averageRating, reviewCount } = await calculateAverageRating(
            productId
          );
          await Product.findByIdAndUpdate(productId, {
            averageRating,
            reviewCount,
          });

          return Response.successResponseData(
            res,
            null,
            Constant.STATUS_CODES.SUCCESS,
            "Review deleted successfully"
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

  /**
   * @description This function is used to mark a review as helpful
   * @param req
   * @param res
   */
  markReviewHelpful: async (req, res) => {
    try {
      const reviewId = req.params.id;

      if (!reviewId) {
        return Response.errorResponseData(
          res,
          "Review ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      getReviewByIdValidation(req, res, async (validate) => {
        if (validate) {
          const review = await Review.findByIdAndUpdate(
            reviewId,
            { $inc: { helpfulCount: 1 } },
            { new: true }
          );

          if (!review) {
            return Response.errorResponseWithoutData(
              res,
              "Review not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          return Response.successResponseData(
            res,
            review,
            Constant.STATUS_CODES.SUCCESS,
            "Review marked as helpful"
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
};
