
import { supabaseAdmin } from '../supabaseClient.js';

export class DoubleEntryLedger {
  static async createTransaction(transactionData) {
    const {
      userId,
      amount,
      description,
      fromAccountId,
      toAccountId,
      transactionType,
      reference
    } = transactionData;

    // Generate unique transaction ID for idempotency
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    try {
      // Start database transaction
      const { data, error } = await supabaseAdmin.rpc('process_double_entry_transaction', {
        p_transaction_id: transactionId,
        p_user_id: userId,
        p_from_account_id: fromAccountId,
        p_to_account_id: toAccountId,
        p_amount: amount,
        p_description: description,
        p_transaction_type: transactionType,
        p_reference: reference || transactionId
      });

      if (error) throw error;
      
      return {
        success: true,
        transactionId,
        data
      };
    } catch (error) {
      // Log to audit trail
      await this.logTransactionFailure({
        transactionId,
        userId,
        error: error.message,
        transactionData
      });
      
      throw error;
    }
  }

  static async logTransactionFailure(failureData) {
    await supabaseAdmin
      .from('transaction_audit_log')
      .insert([{
        transaction_id: failureData.transactionId,
        user_id: failureData.userId,
        action: 'TRANSACTION_FAILED',
        details: failureData,
        created_at: new Date().toISOString()
      }]);
  }

  static async getAccountBalance(accountId) {
    const { data, error } = await supabaseAdmin.rpc('get_account_balance_from_ledger', {
      p_account_id: accountId
    });

    if (error) throw error;
    return data;
  }

  static async validateTransactionIntegrity(transactionId) {
    const { data, error } = await supabaseAdmin.rpc('validate_transaction_integrity', {
      p_transaction_id: transactionId
    });

    if (error) throw error;
    return data;
  }
}
