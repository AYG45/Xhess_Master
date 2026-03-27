import { collection, addDoc, query, where, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SavedGame } from '../types';

export const saveGame = async (game: Omit<SavedGame, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'games'), {
      ...game,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving game:', error);
    throw error;
  }
};

export const getUserGames = async (userId: string): Promise<SavedGame[]> => {
  try {
    const q = query(
      collection(db, 'games'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SavedGame));
  } catch (error: any) {
    console.error('Error fetching games:', error);
    
    // If it's an index error, provide helpful message
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      console.error('Firestore index required. Check the console for the index creation link.');
      console.error('Or create manually: Collection: games, Fields: userId (Ascending), createdAt (Descending)');
    }
    
    throw error;
  }
};

export const deleteGame = async (gameId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'games', gameId));
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
};
