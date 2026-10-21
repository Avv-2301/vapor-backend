const mongoose = require("mongoose");
const Library = require("../../models/Library");
const Product = require("../../models/Product");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const {
  createLibraryValidation,
  getLibraryByIdValidation,
  getLibraryByUserIdValidation,
  addGameValidation,
  removeGameValidation,
} = require("../../services/libraryValidation");

module.exports = {
  /**
   * @description This function is used to create a library for a user
   * @param req
   * @param res
   */
  createLibrary: async (req, res) => {
    try {
      const requestParams = req.body;

      if (!requestParams?.userId) {
        return Response.errorResponseData(
          res,
          "UserId is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      createLibraryValidation(requestParams, res, async (validate) => {
        if (validate) {
          // Check if library already exists for this user
          const existingLibrary = await Library.findOne({
            userId: requestParams.userId,
          });

          if (existingLibrary) {
            return Response.successResponseData(
              res,
              existingLibrary,
              Constant.STATUS_CODES.SUCCESS,
              "Library already exists for this user"
            );
          }

          const libraryObj = {
            userId: requestParams.userId,
            games: [],
            totalGames: 0,
            totalPlayTime: 0,
          };

          const libraryCreation = await Library.create(libraryObj);

          return Response.successResponseData(
            res,
            libraryCreation,
            Constant.STATUS_CODES.CREATED,
            "Library created successfully"
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
   * @description This function is used to get library by ID
   * @param req
   * @param res
   */
  getLibraryById: async (req, res) => {
    try {
      const libraryId = req.params.id || req.query.id;

      if (!libraryId) {
        return Response.errorResponseData(
          res,
          "Library ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      getLibraryByIdValidation(req, res, async (validate) => {
        if (validate) {
          const library = await Library.findOne({
            _id: libraryId,
            userId: req.authUserId,
          });

          if (!library) {
            return Response.errorResponseWithoutData(
              res,
              "Library not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          return Response.successResponseData(
            res,
            library,
            Constant.STATUS_CODES.SUCCESS,
            "Library found"
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
   * @description This function is used to get library by userId
   * @param req
   * @param res
   */
  getLibraryByUserId: async (req, res) => {
    try {
      // Get userId from params, query, or from gateway auth (x-user-id header)
      const userId = req.authUserId;

      if (!userId) {
        return Response.errorResponseData(
          res,
          "UserId is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      getLibraryByUserIdValidation(req, res, async (validate) => {
        if (validate) {
          const library = await Library.findOneAndUpdate(
            { userId },
            { $setOnInsert: { userId, games: [], totalGames: 0, totalPlayTime: 0 } },
            { upsert: true, new: true },
          ).lean();

          const productIds = library.games.map((entry) => entry.gameId).filter(Boolean);
          const products = await Product.find({ _id: { $in: productIds } })
            .select("name slug thumbnail price discountPrice discountPercentage isDiscountActive developer publisher")
            .lean();
          const productsById = new Map(products.map((product) => [String(product._id), product]));
          const libraryWithProducts = {
            ...library,
            games: library.games.map((entry) => ({
              ...entry,
              gameId: productsById.get(String(entry.gameId)) || null,
            })),
          };

          return Response.successResponseData(
            res,
            libraryWithProducts,
            Constant.STATUS_CODES.SUCCESS,
            "Library found"
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

  isGameOwned: async (req, res, next) => {
    try {
      const key = req.params.productKey;
      const product = await Product.findOne({
        $or: [
          { slug: key },
          ...(mongoose.isValidObjectId(key) ? [{ _id: key }] : []),
        ],
      }).select("_id").lean();
      if (!product) return res.status(404).json({ meta: { code: 404, message: "Game not found." } });
      const owned = Boolean(await Library.exists({ userId: req.authUserId, "games.gameId": product._id }));
      return res.json({ data: { owned }, meta: { code: 200, message: "Library ownership checked." } });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * @description This function is used to add a game to library
   * @param req
   * @param res
   */
  addGame: async (req, res) => {
    try {
      const requestParams = req.body;

      if (
        !requestParams?.libraryId ||
        !requestParams?.gameId ||
        !requestParams?.gameName
      ) {
        return Response.errorResponseData(
          res,
          "Missing required fields (libraryId, gameId, gameName)",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      addGameValidation(requestParams, res, async (validate) => {
        if (validate) {
          const library = await Library.findOne({
            _id: requestParams.libraryId,
            userId: req.authUserId,
          });

          if (!library) {
            return Response.errorResponseWithoutData(
              res,
              "Library not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          // Check if game already exists in library
          const gameExists = library.games.some(
            (game) => game.gameId.toString() === requestParams.gameId
          );

          if (gameExists) {
            return Response.errorResponseWithoutData(
              res,
              "Game already exists in library",
              Constant.STATUS_CODES.DATA_CONFLICT
            );
          }

          // Add game to library
          library.games.push({
            gameId: requestParams.gameId,
            gameName: requestParams.gameName,
            purchaseDate: new Date(),
            playTime: 0,
            lastPlayed: null,
            isInstalled: false,
          });

          library.totalGames = library.games.length;

          const updatedLibrary = await library.save();

          return Response.successResponseData(
            res,
            updatedLibrary,
            Constant.STATUS_CODES.SUCCESS,
            "Game added to library successfully"
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
   * @description This function is used to remove a game from library
   * @param req
   * @param res
   */
  removeGame: async (req, res) => {
    try {
      const requestParams = req.body;

      if (!requestParams?.libraryId || !requestParams?.gameId) {
        return Response.errorResponseData(
          res,
          "Library ID and Game ID are required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      removeGameValidation(requestParams, res, async (validate) => {
        if (validate) {
          const library = await Library.findOne({
            _id: requestParams.libraryId,
            userId: req.authUserId,
          });

          if (!library) {
            return Response.errorResponseWithoutData(
              res,
              "Library not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          // Find and remove game
          const gameIndex = library.games.findIndex(
            (game) => game.gameId.toString() === requestParams.gameId
          );

          if (gameIndex === -1) {
            return Response.errorResponseWithoutData(
              res,
              "Game not found in library",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          // Remove playtime from total
          const gameToRemove = library.games[gameIndex];
          library.totalPlayTime -= gameToRemove.playTime || 0;

          // Remove game from array
          library.games.splice(gameIndex, 1);
          library.totalGames = library.games.length;

          const updatedLibrary = await library.save();

          return Response.successResponseData(
            res,
            updatedLibrary,
            Constant.STATUS_CODES.SUCCESS,
            "Game removed from library successfully"
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
   * @description This function is used to update game playtime
   * @param req
   * @param res
   */
  updateGamePlayTime: async (req, res) => {
    try {
      const { libraryId, gameId, playTime } = req.body;

      if (!libraryId || !gameId || playTime === undefined) {
        return Response.errorResponseData(
          res,
          "Library ID, Game ID, and Play Time are required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      const library = await Library.findOne({
        _id: libraryId,
        userId: req.authUserId,
      });

      if (!library) {
        return Response.errorResponseWithoutData(
          res,
          "Library not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      }

      const game = library.games.find((g) => g.gameId.toString() === gameId);

      if (!game) {
        return Response.errorResponseWithoutData(
          res,
          "Game not found in library",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      }

      // Update playtime
      const oldPlayTime = game.playTime || 0;
      game.playTime = playTime;
      game.lastPlayed = new Date();

      // Update total playtime
      library.totalPlayTime = library.totalPlayTime - oldPlayTime + playTime;

      const updatedLibrary = await library.save();

      return Response.successResponseData(
        res,
        updatedLibrary,
        Constant.STATUS_CODES.SUCCESS,
        "Game playtime updated successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};
