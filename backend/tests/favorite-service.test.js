jest.mock('../repositories/favoriteRepository', () => ({
  getProduct: jest.fn(),
  listForUser: jest.fn(),
  isFavorite: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
  countForProduct: jest.fn()
}));

const repository = require('../repositories/favoriteRepository');
const favoriteService = require('../services/favoriteService');

describe('favorite service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists favorites with count', async () => {
    repository.listForUser.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await expect(favoriteService.list(10)).resolves.toEqual({
      favorites: [{ id: 1 }, { id: 2 }],
      count: 2
    });
  });

  test('adds a favorite when product exists and is not already favorited', async () => {
    repository.getProduct.mockResolvedValue({ id: 7 });
    repository.isFavorite.mockResolvedValue(false);
    repository.countForProduct.mockResolvedValue(3);

    await expect(favoriteService.toggle(10, 7)).resolves.toEqual({
      favorited: true,
      likes_count: 3
    });
    expect(repository.add).toHaveBeenCalledWith(10, 7);
    expect(repository.remove).not.toHaveBeenCalled();
  });

  test('removes an existing favorite', async () => {
    repository.getProduct.mockResolvedValue({ id: 7 });
    repository.isFavorite.mockResolvedValue(true);
    repository.countForProduct.mockResolvedValue(2);

    await expect(favoriteService.toggle(10, 7)).resolves.toEqual({
      favorited: false,
      likes_count: 2
    });
    expect(repository.remove).toHaveBeenCalledWith(10, 7);
    expect(repository.add).not.toHaveBeenCalled();
  });

  test('rejects favorites for missing products', async () => {
    repository.getProduct.mockResolvedValue(null);

    await expect(favoriteService.status(10, 999)).rejects.toMatchObject({
      status: 404,
      code: 'PRODUCT_NOT_FOUND'
    });
  });
});
