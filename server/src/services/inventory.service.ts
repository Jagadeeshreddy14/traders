import { Product, Inventory, IOrderDocument } from '../models';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export class InventoryService {
  /**
   * Atomically reserve stock for an order initiating online payment.
   * Decrements Product available stock and increments Inventory reserved stock.
   */
  public static async reserveStockForOrder(order: IOrderDocument): Promise<void> {
    const reservedItems: Array<{ productId: string; quantity: number }> = [];

    try {
      for (const item of order.items) {
        // Atomic conditional decrement to guarantee no overselling
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stockQuantity: { $gte: item.quantity },
            isAvailable: true,
          },
          {
            $inc: { stockQuantity: -item.quantity },
          },
          { new: true }
        );

        if (!updatedProduct) {
          throw AppError.badRequest(
            `Insufficient stock for "${item.name}". Please adjust quantity in cart.`
          );
        }

        reservedItems.push({ productId: item.product.toString(), quantity: item.quantity });

        // Update Inventory record reserved stock
        await Inventory.findOneAndUpdate(
          { product: item.product },
          { $inc: { reservedStock: item.quantity } },
          { upsert: true }
        );
      }

      logger.info('Inventory successfully reserved for order', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        itemsCount: order.items.length,
      });
    } catch (error: any) {
      // Rollback any items that were reserved in this loop prior to failure
      logger.warn('Rolling back partial inventory reservation for order', {
        orderId: order._id,
        reservedItems,
      });

      for (const resItem of reservedItems) {
        await Product.findByIdAndUpdate(resItem.productId, {
          $inc: { stockQuantity: resItem.quantity },
        });
        await Inventory.findOneAndUpdate(
          { product: resItem.productId },
          { $inc: { reservedStock: -resItem.quantity } }
        );
      }

      throw error;
    }
  }

  /**
   * Finalize inventory deduction when online payment succeeds.
   * Converts reserved stock to permanent deduction.
   */
  public static async finalizeStockDeduction(order: IOrderDocument): Promise<void> {
    if (order.inventoryDeducted) {
      logger.info('Inventory already finalized for order, skipping', { orderId: order._id });
      return;
    }

    for (const item of order.items) {
      await Inventory.findOneAndUpdate(
        { product: item.product },
        {
          $inc: {
            currentStock: -item.quantity,
            reservedStock: -item.quantity,
          },
        }
      );
    }

    order.inventoryDeducted = true;
    await order.save();

    logger.info('Inventory finalized permanently for order', {
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  }

  /**
   * Release reserved stock on payment failure or cancellation.
   */
  public static async releaseReservedStock(order: IOrderDocument): Promise<void> {
    if (order.inventoryDeducted) {
      // Stock was already permanently deducted, cannot simply release reservation
      return;
    }

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: item.quantity },
      });
      await Inventory.findOneAndUpdate(
        { product: item.product },
        {
          $inc: { reservedStock: -item.quantity },
        }
      );
    }

    logger.info('Reserved inventory released back to stock for order', {
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  }

  /**
   * Direct stock deduction for COD orders upon order acceptance.
   */
  public static async deductStockForCodOrder(order: IOrderDocument): Promise<void> {
    if (order.inventoryDeducted) {
      return;
    }

    const deductedItems: Array<{ productId: string; quantity: number }> = [];

    try {
      for (const item of order.items) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stockQuantity: { $gte: item.quantity },
            isAvailable: true,
          },
          {
            $inc: { stockQuantity: -item.quantity },
          },
          { new: true }
        );

        if (!updatedProduct) {
          throw AppError.badRequest(
            `Insufficient stock for "${item.name}". Please adjust quantity.`
          );
        }

        deductedItems.push({ productId: item.product.toString(), quantity: item.quantity });

        await Inventory.findOneAndUpdate(
          { product: item.product },
          { $inc: { currentStock: -item.quantity } },
          { upsert: true }
        );
      }

      order.inventoryDeducted = true;
      await order.save();

      logger.info('Inventory deducted for COD order', {
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    } catch (error: any) {
      for (const dedItem of deductedItems) {
        await Product.findByIdAndUpdate(dedItem.productId, {
          $inc: { stockQuantity: dedItem.quantity },
        });
        await Inventory.findOneAndUpdate(
          { product: dedItem.productId },
          { $inc: { currentStock: dedItem.quantity } }
        );
      }
      throw error;
    }
  }
}
