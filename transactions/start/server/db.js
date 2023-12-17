const { initializeApp} = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { doc, collection, addDoc, getDocs, getDoc, setDoc, where, query, updateDoc, deleteDoc, orderBy, limit } = require( "@firebase/firestore"); 
const fs = require("fs");
const crypto = require("crypto");
const { SimpleTransaction } = require("./simpleTransactionObject");

// You may want to have this point to different databases based on your environment
const firebase = initializeApp({
  apiKey: "AIzaSyB3_uMBKDBIdAv2ry6ktoET2cE4rVRDPuQ",
  authDomain: "bankconnectionmodule.firebaseapp.com",
  projectId: "bankconnectionmodule",
  storageBucket: "bankconnectionmodule.appspot.com",
  messagingSenderId: "941613054623",
  appId: "1:941613054623:web:ec916471e93d217e9580aa",
  measurementId: "G-5B3W6DWWV2"
});
const db = getFirestore(firebase);
const debugExposeDb = function () {
  return db;
};

const getItemIdsForUser = async function (userId) {
    try {
      if (!userId) {
        throw new Error("Invalid userId");
      }
  
      const col = collection(db, 'items');
      const itemsQuery = query(col, where('user_id', '==', userId));
  
      const snapshot = await getDocs(itemsQuery);
      return snapshot.docs.map(doc => doc.data().id);
    } catch (error) {
      console.error('Error retrieving item IDs for user: ${error}');
      throw error; // Handle or log the error as needed
    }
  };

const getItemsAndAccessTokensForUser = async function (userId) {
  const col = collection(db, 'items');

  const itemsQuery = query(col, where('user_id', '==', userId));
  
  try {
    const snapshot = await getDocs(itemsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      access_token: doc.data().access_token,
    }));
  } catch (error) {
    console.error(`Error retrieving items and access tokens for user: ${error}`);
    throw error; // Handle or log the error as needed
  }
};

const getAccountIdsForItem = async function (itemId) {
  const col = collection(db, 'accounts');

  const accountsQuery = query(col, where('item_id', '==', itemId));
  
  try {
    const snapshot = await getDocs(accountsQuery);
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error(`Error retrieving account IDs for item: ${error}`);
    throw error; // Handle or log the error as needed
  }
};

const confirmItemBelongsToUser = async function (possibleItemId, userId) {
  const col = collection(db, 'items');

  const query = query(col, where('id', '==', possibleItemId), where('user_id', '==', userId));

  try {
    const snapshot = await getDocs(query);

    if (!snapshot.empty) {
      const itemData = snapshot.docs[0].data();
      
      if (itemData.user_id === userId) {
        return true;
      } else {
        console.warn(`User ${userId} claims to own item they don't: ${possibleItemId}`);
        return false;
      }
    } else {
      console.warn(`Item not found: ${possibleItemId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error confirming item ownership: ${error}`);
    throw error; // Handle or log the error as needed
  }
};

const deactivateItem = async function (itemId) {
  const col = collection(db, 'items');

  const itemRef = query(col, where('id', '==', itemId));
  
  try {
    await setDoc(itemRef, {
      access_token: 'REVOKED',
      is_active: 0
    });
  } catch (error) {
    console.error('Error updating item:', error);
    throw error; // Handle the error appropriately in your application
  }
};

const addUser = async function (userId, username) {
  try {
    const res = await addDoc(collection(db, 'users'), {
      id: userId,
      username: username,
    });

    console.log(`User added successfully: ${res.id}`);
    return res;
  } catch (error) {
    console.error(`Error adding user: ${error}`);
    throw error; // Handle or log the error as needed
  }
};

const getUserList = async function () {
  const col = collection(db, 'users');
  const querySnapshot = await getDocs(col);

  const result = [];
  querySnapshot.forEach(doc => {
    result.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  return result;
};

const getUserRecord = async function (userId) {
  const col = collection(db, 'users');

  const userQuery = query(col, where('id', '==', userId));

  const snapshot = await getDocs(userQuery);
  
  try {
    if (!snapshot.empty) {
      return snapshot.docs[0].data();
    } else {
      console.warn(`User record not found for user ID: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error retrieving user record: ${error}`);
    throw error; // Handle or log the error as needed
  }
};

const getBankNamesForUser = async function (userId) {
  const col = collection(db, 'items');

  const itemsQuery = query(col, where('user_id', '==', userId));

  try {
    const snapshot = await getDocs(itemsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      bank_name: doc.data().bank_name,
    }));
  } catch (error) {
    console.error(`Error retrieving bank names for user: ${error}`);
    throw error; // Handle or log the error as needed
  }
};

const addItem = async function (itemId, userId, accessToken) {
  const itemRef = doc(db, 'items', itemId);

  try {
    await setDoc(itemRef, {
      id: itemId,
      user_id: userId,
      access_token: accessToken,
    });
  } catch (error) {
    console.error(`Error adding item: ${error}`);
    throw error; // Handle or log the error as needed
  }
};
const addBankNameForItem = async function (itemId, institutionName) {
  const itemRef = doc(db, 'items', itemId);

  try {
    await updateDoc(itemRef, {
      bank_name: institutionName,
    });
  } catch (error) {
    console.error(`Error adding bank name for item: ${error}`);
    throw error; // Handle or log the error as needed
  }
};

const addAccount = async function (accountId, itemId, acctName) {
  const accountRef = doc(db, 'accounts', accountId);

  try {
    await setDoc(accountRef, {
      id: accountId,
      item_id: itemId,
      name: acctName,
    });
  } catch (error) {
    console.error(`Error adding account: ${error}`);
    throw error; // Handle or log the error as needed
  }
};

const getItemInfo = async function (itemId) {
  try {
    if (!itemId) {
      throw new Error("Invalid itemId");
    }

    const col = collection(db, 'items');
    const itemRef = query(col, where('id', '==', itemId));

    const snapshot = await getDocs(itemRef);
    if (!snapshot.empty) {
      const item = snapshot.docs[0].data(); // Access the first document's data
      return {
        user_id: item.user_id,
        access_token: item.access_token,
        transaction_cursor: item.transaction_cursor,
      };
    } else {
      console.log("Didn't find item");
      return null;
    }
  } catch (error) {
    console.error(`Error retrieving item info: ${error}`);
    throw error; // Handle or log the error as needed
  }
};

const getItemInfoForUser = async function (itemId, userId) {
  const col = collection(db, 'items');
  
  try {
    // Use where conditions directly in the query function
    const itemRef = query(col, where('id', '==', itemId), where('user_id', '==', userId));

    const snapshot = await getDocs(itemRef);

    if (!snapshot.empty) {
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: data.user_id,
          accessToken: data.access_token,
          transactionCursor: data.transaction_cursor
        };
      });
    } else {
      console.log("Item not found for the specified user");
      return null;
    }
  } catch (error) {
    console.error(`Error retrieving item info for user: ${error}`);
    throw error; // Handle or log the error as needed
  }
};
/**
 * Add a new transaction to our database
 *
 * @param {SimpleTransaction} transactionObj
 */
const addNewTransaction = async function (transactionObj) {
  try {
    console.log(`Getting ready to insert ${JSON.stringify(transactionObj)}`);

    // Set the document data
    const result = await addDoc(collection(db, 'transactions'),{
      id: transactionObj.id,
      user_id: transactionObj.userId,
      account_id: transactionObj.accountId,
      category: transactionObj.category,
      date: transactionObj.date,
      authorized_date: transactionObj.authorizedDate,
      name: transactionObj.name,
      amount: transactionObj.amount,
      currency_code: transactionObj.currencyCode
    });

    if (transactionObj.pendingTransactionId != null) {
      // This might be a good time to copy over any user-created values from
      // that other transaction to this one.
    }
    return result;
  } catch (error) {
    console.log(`Looks like I'm encountering an error. ${JSON.stringify(error)}`);
    throw error; // Rethrow the error to propagate it further
  }
};

/**
 *
 * Modify an existing transaction in our database
 *
 * @param {SimpleTransaction} transactionObj
 */
const modifyExistingTransaction = async function (transactionObj) {
  try {
    const result = await transactionRef.setDoc(collection(db,'transactions'),{
      account_id: transactionObj.accountId,
      category: transactionObj.category,
      date: transactionObj.date,
      authorized_date: transactionObj.authorizedDate,
      name: transactionObj.name,
      amount: transactionObj.amount,
      currency_code: transactionObj.currencyCode
    });

    return result;
  } catch (error) {
    console.log(`Looks like I'm encountering an error. ${JSON.stringify(error)}`);
    throw error; // Rethrow the error to propagate it further
  }
};

/**
 * Mark a transaction as removed from our database
 *
 * @param {string} transactionId
 */
const markTransactionAsRemoved = async function (transactionId) {
  try {
    const updatedId = transactionId + '-REMOVED-' + crypto.randomUUID();

    const col = collection(db, 'transactions');
    const queryTransaction = query(col, where('id', '==', transactionId));

    const docSnapshots = await getDocs(queryTransaction);
    
    if (!docSnapshots.empty) {
      const doc = docSnapshots.docs[0];
      const docRef = doc.ref;

      await updateDoc(docRef, {
        id: updatedId,
        is_removed: 1,
      });

      return { success: true };
    } else {
      console.log("Transaction not found");
      return { success: false, message: "Transaction not found" };
    }
  } catch (error) {
    console.error(`Error marking transaction as removed: ${error}`);
    throw error;
  }
};

/**
 * Actually delete a transaction from the database
 *
 * @param {string} transactionId
 */
const deleteExistingTransaction = async function (transactionId) {
  try {
    // Create a reference to the transaction
    const col = collection(db, 'transactions');
    const query = query(col, where('id', '==', transactionId));
    // Delete the transaction
    const result = await deleteDoc(query);
    return result;
  } catch (error) {
    console.log(`Looks like I'm encountering an error. ${JSON.stringify(error)}`);
    throw error; // Rethrow the error to propagate it further
  }
};

/**
 * Fetch transactions for our user from the database
 *
 * @param {string} userId
 * @param {number} maxNum
 */
const getTransactionsForUser = async function (userId, maxNum) {
  try {
    if (!userId) {
      throw new Error("Invalid userId");
    }

    const col = collection(db, 'transactions');

    const q = query(
      col,
      where('user_id', '==', userId), // Provide a default empty string if userId is falsy
      //where('is_removed', '==', '0'),
      orderBy('date', 'desc'),
      limit(maxNum)
    );

    const querySnapshot = await getDocs(q);

    res = []

    const results = querySnapshot.docs.map(doc => {
      const data = doc.data();
      res.append({
        ...data,
        account_name: data.account_id,
        bank_name: data.item_id,
      });
    });

    return res;
  } catch (error) {
    console.error('Error retrieving transactions for user: ${error}');
    throw error;
  }
};

/**
 * Save our cursor to the database
 *
 * @param {string} transactionCursor
 * @param {string} itemId
 */
const saveCursorForItem = async function (transactionCursor, itemId) {
  try {
    if (!itemId) {
      throw new Error("Invalid itemId");
    }

    const col = collection(db, 'items');
    const itemRef = doc(col, itemId); // Use doc to obtain a reference to the document

    await updateDoc(itemRef, { transaction_cursor: transactionCursor });
  } catch (error) {
    console.error(`Error saving cursor for item: ${JSON.stringify(error)}`);
    throw error; // Rethrow the error to propagate it further
  }
};
module.exports = {
  debugExposeDb,
  getItemIdsForUser,
  getItemsAndAccessTokensForUser,
  getAccountIdsForItem,
  confirmItemBelongsToUser,
  deactivateItem,
  addUser,
  getUserList,
  getUserRecord,
  getBankNamesForUser,
  addItem,
  addBankNameForItem,
  addAccount,
  getItemInfo,
  getItemInfoForUser,
  addNewTransaction,
  modifyExistingTransaction,
  deleteExistingTransaction,
  markTransactionAsRemoved,
  getTransactionsForUser,
  saveCursorForItem,
};
