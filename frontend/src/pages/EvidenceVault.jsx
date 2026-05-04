import React, { useEffect, useState } from 'react';
import axios from 'axios';

const EvidenceVault = () => {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/v1/evidence');
        setEvidenceList(data);
      } catch (error) {
        console.error("Error fetching evidence:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvidence();
  }, []);

  const deleteEvidence = async (id) => {
    if (!window.confirm("Are you sure you want to delete this evidence?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/v1/evidence/${id}`);
      setEvidenceList(evidenceList.filter(item => item._id !== id));
    } catch (error) {
      console.error("Error deleting evidence:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Immutable Evidence Vault
          </h1>
          <p className="text-gray-400">Securely stored audio and video recordings.</p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
          </div>
        ) : evidenceList.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-xl">No evidence recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {evidenceList.map((item) => (
              <div 
                key={item._id} 
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-blue-500/50 transition duration-300 transform hover:-translate-y-1"
              >
                <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400">
                      {item.triggerType}
                    </span>
                    <button 
                      onClick={() => deleteEvidence(item._id)}
                      className="text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 p-1.5 rounded-full transition-colors"
                      title="Delete Evidence"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  {item.fileType === 'video' ? (
                    <video 
                      src={`http://localhost:5000${item.filePath}`} 
                      controls 
                      className="w-full h-48 object-cover rounded-xl bg-black"
                    />
                  ) : item.fileType === 'audio' ? (
                    <audio 
                      src={`http://localhost:5000${item.filePath}`} 
                      controls 
                      className="w-full mt-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-800 flex items-center justify-center rounded-xl">
                      <span className="text-gray-500">Unsupported format</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidenceVault;
