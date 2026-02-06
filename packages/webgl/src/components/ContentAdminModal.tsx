import React, { useState, useEffect } from 'react';
import { FaCouch, FaCube, FaUpload, FaDoorOpen, FaClock, FaArrowLeft } from 'react-icons/fa';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import PortalAdminModal from './PortalAdminModal';
import { usePlaceCatalogueItem } from '../hooks/unityEvents/usePlaceCatalogueItem';

const categories = [
  "Recent", "Furniture", "Objects", "Upload", "Portals"
];

const CATEGORY_KEY_MAP: Record<string, string> = {
  Furniture: "chair",
  Objects: "misc"
};

interface CatalogueItem {
  id: string;
  name: string;
  thumbnail: string;
  glbUrl: string;
  categories: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: { spaceID: string };
}

const ContentAdminModal: React.FC<Props> = ({ isOpen, onClose, settings }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePortalView, setShowCreatePortalView] = useState(false);
  const [isPortalAdminModalOpen, setIsPortalAdminModalOpen] = useState(false);
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { placeCatalogueItem } = usePlaceCatalogueItem();

  useEffect(() => {
    if (isOpen) {
      const fetchCatalogueItems = async () => {
        setIsLoading(true);
        setFetchError(null);
        setCatalogueItems([]);
        try {
          const catalogueRef = collection(db, 'catalogue');
          const querySnapshot = await getDocs(catalogueRef);
          const items: CatalogueItem[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const allowedCategories = ["chair", "misc"];
            if (data.glbUrl && data.categories?.some((cat: string) => allowedCategories.includes(cat))) {
              items.push({
                id: doc.id,
                name: data.name || 'Unnamed Item',
                thumbnail: data.thumbnail?.src || 'https://via.placeholder.com/150',
                glbUrl: data.glbUrl,
                categories: data.categories
              });
            }
          });

          setCatalogueItems(items);
        } catch (err) {
          console.error("Error fetching catalogue items:", err);
          setFetchError("Failed to load catalogue items. Please check your connection and try again.");
        }
        setIsLoading(false);
      };
      fetchCatalogueItems();
    }
  }, [isOpen]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setSearchTerm('');
    if (category === "Portals") {
      setShowCreatePortalView(true);
    } else {
      setShowCreatePortalView(false);
    }
  };

  const handleBackToHome = () => {
    setSelectedCategory(null);
    setShowCreatePortalView(false);
    setSearchTerm('');
  };

  const filterByCategory = (items: CatalogueItem[], category: string | null) => {
    const key = category ? CATEGORY_KEY_MAP[category] : null;
    let filtered = items;

    if (key) {
      filtered = filtered.filter(item => item.categories?.includes(key));
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredItems = ["Furniture", "Objects"].includes(selectedCategory || '')
    ? filterByCategory(catalogueItems, selectedCategory)
    : [];

  const handlePlaceItem = async (item: CatalogueItem) => {
    try {
      if (!item.glbUrl) {
        console.error('Item is missing GLB URL');
        return;
      }

      const itemId = `item_${settings.spaceID}_${Date.now()}`;
      const position = { x: 0, y: 0, z: 0 };
      const rotation = { x: 0, y: 0, z: 0 };
      const scale = { x: 1, y: 1, z: 1 };

      const itemData = {
        itemId,
        name: item.name || 'Unnamed Item',
        glbUrl: item.glbUrl,
        thumbnail: item.thumbnail || 'https://via.placeholder.com/150',
        position,
        rotation,
        scale,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        categories: item.categories || []
      };

      if (!itemData.glbUrl) {
        throw new Error('GLB URL is required');
      }

      await setDoc(doc(db, 'spaces', settings.spaceID, 'catalogue', itemId), itemData);

      const success = placeCatalogueItem(
        itemId,
        itemData.glbUrl,
        position,
        rotation,
        scale
      );

      if (success) {
        onClose();
      } else {
        console.error('Failed to place item in Unity');
      }
    } catch (error) {
      console.error('Error placing item:', error);
    }
  };

  const handleOpenPortalAdminModal = () => {
    setIsPortalAdminModalOpen(true);
  };

  const handleClosePortalAdminModal = () => {
    setIsPortalAdminModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed left-5 top-5 w-[360px] max-w-[360px] h-[80vh] max-h-[80vh] bg-[#1a1a1a] text-white rounded-2xl border border-[#333] overflow-hidden shadow-xl z-[9999]">
        <div className="flex items-center gap-2 text-md font-semibold pb-1 pt-3 px-4 border-b border-white/30">
          {selectedCategory && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleBackToHome}
              aria-label="Back"
            >
              <FaArrowLeft />
            </button>
          )}
          <span>
            {selectedCategory ? (showCreatePortalView ? "Create New Portal" : selectedCategory) : "Content Catalogue"}
          </span>
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col h-[calc(100%-60px)]">
          {!selectedCategory && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => handleCategoryClick('Recent')}
                  className="cursor-pointer bg-white/[0.06] border border-white/[0.12] rounded-xl h-[120px] flex items-center justify-center hover:bg-white/[0.12]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FaClock size={32} />
                    <span className="text-sm">Recent</span>
                  </div>
                </div>
                <div
                  onClick={() => handleCategoryClick('Furniture')}
                  className="cursor-pointer bg-white/[0.06] border border-white/[0.12] rounded-xl h-[120px] flex items-center justify-center hover:bg-white/[0.12]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FaCouch size={32} />
                    <span className="text-sm">Furniture</span>
                  </div>
                </div>
                <div
                  onClick={() => handleCategoryClick('Objects')}
                  className="cursor-pointer bg-white/[0.06] border border-white/[0.12] rounded-xl h-[120px] flex items-center justify-center hover:bg-white/[0.12]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FaCube size={32} />
                    <span className="text-sm">Objects</span>
                  </div>
                </div>
                <div
                  onClick={() => handleCategoryClick('Upload')}
                  className="cursor-pointer bg-white/[0.06] border border-white/[0.12] rounded-xl h-[120px] flex items-center justify-center hover:bg-white/[0.12]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FaUpload size={32} />
                    <span className="text-sm">Upload</span>
                  </div>
                </div>
                <div
                  onClick={() => handleCategoryClick('Portals')}
                  className="cursor-pointer bg-white/[0.06] border border-white/[0.12] rounded-xl h-[120px] flex items-center justify-center col-span-2 hover:bg-white/[0.12]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FaDoorOpen size={32} />
                    <span className="text-sm">Portals</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedCategory === "Portals" && showCreatePortalView ? (
            <div className="p-4 flex-grow flex flex-col items-center justify-center">
              <button className="btn btn-lg btn-primary" onClick={handleOpenPortalAdminModal}>Browse</button>
            </div>
          ) : selectedCategory && (
            <>
              <div className="p-4">
                <input
                  type="text"
                  placeholder={`Search in ${selectedCategory}...`}
                  className="input input-bordered w-full bg-white/5 border-white/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="p-4 pt-0 overflow-y-auto flex-grow">
                <div className="grid grid-cols-2 gap-3">
                  {isLoading ? (
                    <p className="text-white/70">Loading items...</p>
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <div
                        key={item.id}
                        className="p-2 bg-white/10 rounded-lg text-center cursor-pointer hover:bg-white/30 hover:scale-105 transition-all flex flex-col"
                        onClick={() => handlePlaceItem(item)}
                      >
                        <div
                          className="h-[84px] mb-2 rounded-md bg-contain bg-no-repeat bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${item.thumbnail})` }}
                        />
                        <p className="text-xs truncate flex-grow flex items-center justify-center">
                          {item.name}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/70">
                      {selectedCategory === "Furniture" && "No chairs found in the catalogue."}
                      {selectedCategory === "Objects" && "No miscellaneous objects found in the catalogue."}
                      {!["Furniture", "Objects"].includes(selectedCategory) &&
                        `No items found in "${selectedCategory}"${searchTerm && ` matching "${searchTerm}"`}.`}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <PortalAdminModal
        isOpen={isPortalAdminModalOpen}
        onClose={handleClosePortalAdminModal}
        currentSpaceId={settings?.spaceID}
      />
    </>
  );
};

export default ContentAdminModal;
