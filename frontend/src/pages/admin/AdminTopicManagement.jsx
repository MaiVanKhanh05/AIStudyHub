import { useState, useEffect } from "react";
import { Folder, Plus, Edit2, Trash2, BookOpen, AlertCircle, Loader, X, Check, Search } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminTopicManagement() {
  const { language } = useLanguage();
  const [topics, setTopics] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [subjectSearch, setSubjectSearch] = useState("");
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Folder",
    color: "#6366f1",
    subjects: []
  });

  const fetchTopics = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/admin/topics", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTopics(data);
      }
    } catch (err) {
      console.error(err);
      showToast(language === "vi" ? "Lỗi khi tải danh sách chủ đề" : "Error loading topics", "error");
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/subjects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([fetchTopics(), fetchSubjects()]).finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenModal = (topic = null) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({
        name: topic.name,
        description: topic.description || "",
        icon: topic.icon || "Folder",
        color: topic.color || "#6366f1",
        subjects: topic.subjects.map(s => s.subject_code)
      });
    } else {
      setEditingTopic(null);
      setFormData({ name: "", description: "", icon: "Folder", color: "#6366f1", subjects: [] });
    }
    setSubjectSearch("");
    setIsModalOpen(true);
  };

  
  
  const handleStandaloneCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectCode || !newSubjectName) {
      showToast(language === "vi" ? "Vui lòng nhập đầy đủ mã môn và tên môn" : "Please enter both subject code and name", "error");
      return;
    }
    setIsAddingSubject(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ subject_code: newSubjectCode, subject_name: newSubjectName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi thêm môn học");
      
      const newSubj = { subject_code: data.subject_code, subject_name: data.subject_name };
      setSubjects(prev => [...prev, newSubj].sort((a, b) => a.subject_code.localeCompare(b.subject_code)));
      
      setIsSubjectModalOpen(false);
      setNewSubjectCode("");
      setNewSubjectName("");
      showToast("Đã thêm môn học thành công!");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsAddingSubject(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectCode || !newSubjectName) {
      showToast("Vui lòng nhập đầy đủ mã môn và mô tả", "error");
      return;
    }
    setIsAddingSubject(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ subject_code: newSubjectCode, subject_name: newSubjectName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi thêm môn học");
      
      const newSubj = { subject_code: data.subject_code, subject_name: data.subject_name };
      setSubjects(prev => [...prev, newSubj].sort((a, b) => a.subject_code.localeCompare(b.subject_code)));
      setFormData(prev => ({ ...prev, subjects: [...prev.subjects, data.subject_code] }));
      
      setShowAddSubject(false);
      setNewSubjectCode("");
      setNewSubjectName("");
      showToast("Đã thêm môn học thành công!");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsAddingSubject(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const method = editingTopic ? "PUT" : "POST";
      const url = editingTopic 
        ? `http://localhost:5000/api/admin/topics/${editingTopic.topic_id}` 
        : `http://localhost:5000/api/admin/topics`;

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color
        })
      });

      if (!res.ok) throw new Error(language === "vi" ? "Lỗi khi lưu chủ đề" : "Error saving topic");
      const savedTopic = await res.json();

      // Nếu có subjects, gọi API assign subjects
      if (formData.subjects) {
        await fetch(`http://localhost:5000/api/admin/topics/${savedTopic.topic_id || editingTopic.topic_id}/subjects`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ subjects: formData.subjects })
        });
      }

      showToast(editingTopic ? (language === "vi" ? "Cập nhật thành công" : "Update successful") : (language === "vi" ? "Tạo chủ đề thành công" : "Topic created"));
      setIsModalOpen(false);
      fetchTopics();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(language === "vi" ? "Bạn có chắc chắn muốn xóa chủ đề này?" : "Are you sure you want to delete this topic?")) return;
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/admin/topics/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === "vi" ? "Xóa thành công" : "Deleted successfully");
        fetchTopics();
      } else {
        throw new Error(language === "vi" ? "Lỗi khi xóa" : "Error deleting");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const toggleSubject = (code) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(code)
        ? prev.subjects.filter(c => c !== code)
        : [...prev.subjects, code]
    }));
  };

  return (
    <div className="adm-page-container fade-in min-h-screen bg-slate-50 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 transition-all ${toast.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {toast.type === "error" ? <AlertCircle size={18} /> : <Check size={18} />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-extrabold !text-slate-800 tracking-tight">{language === "vi" ? "Quản lý Chủ đề (Topics)" : "Topic Management"}</h1>
          <p className="text-[14px] text-slate-500 mt-1 font-medium">{language === "vi" ? "Nhóm các môn học vào chủ đề để dễ quản lý" : "Group subjects into topics for easy management"}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSubjectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus size={18} /> {language === "vi" ? "Thêm Mã Môn" : "Add Subject"}
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold transition-all shadow-sm active:scale-95"
          >
          <Plus size={18} /> {language === "vi" ? "Thêm Chủ đề" : "Add Topic"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="animate-spin text-violet-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map(topic => (
            <div 
              key={topic.topic_id} 
              onClick={() => handleOpenModal(topic)}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-violet-300 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border border-slate-100" style={{ backgroundColor: `${topic.color || "#6366f1"}15` }}>
                  <Folder className="w-6 h-6" style={{ color: topic.color || "#6366f1" }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenModal(topic); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(topic.topic_id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{topic.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 h-10 mb-4">{topic.description || (language === "vi" ? "Chưa có mô tả." : "No description yet.")}</p>
              
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <BookOpen size={14} className="text-slate-400" />
                {topic.subjects?.length || 0} {language === "vi" ? "môn học" : "subjects"}
              </div>
            </div>
          ))}
          {topics.length === 0 && (
             <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                {language === "vi" ? "Chưa có chủ đề nào. Hãy tạo chủ đề đầu tiên!" : "No topics yet. Create your first topic!"}
             </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingTopic ? (language === "vi" ? "Cập nhật Chủ đề" : "Update Topic") : (language === "vi" ? "Tạo Chủ đề mới" : "Create New Topic")}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 md:col-span-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{language === "vi" ? "Tên chủ đề" : "Topic Name"}</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-sm" placeholder={language === "vi" ? "VD: Công nghệ thông tin" : "Ex: Information Technology"} />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{language === "vi" ? "Màu sắc" : "Color"}</label>
                  <div className="flex gap-2 items-center h-10">
                    <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                    <span className="text-sm text-slate-500 uppercase">{formData.color}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{language === "vi" ? "Mô tả" : "Description"}</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-sm resize-none" placeholder={language === "vi" ? "Nhập mô tả ngắn..." : "Enter short description..."} />
              </div>

              <div className="space-y-2">
                
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{language === "vi" ? `Môn học (${formData.subjects.length} đã chọn)` : `Subjects (${formData.subjects.length} selected)`}</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowAddSubject(!showAddSubject)}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} /> {language === "vi" ? "Thêm môn" : "Add Subject"}
                    </button>
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-1.5 text-slate-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder={language === "vi" ? "Tìm kiếm môn học..." : "Search subject..."}
                        value={subjectSearch}
                        onChange={e => setSubjectSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
                {formData.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.subjects.map(code => {
                      const s = subjects.find(sub => sub.subject_code === code);
                      return (
                        <span key={code} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium">
                          <span className="font-bold">{code}</span>
                          <span className="text-violet-500/50">|</span>
                          <span className="truncate max-w-[120px]" title={s?.subject_name || ""}>{s?.subject_name || ""}</span>
                          <button type="button" onClick={() => toggleSubject(code)} className="ml-1 p-0.5 hover:bg-violet-200 rounded-full text-violet-500 hover:text-violet-800 transition-colors">
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}


                {showAddSubject && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex flex-col gap-2 animate-in slide-in-from-top-2">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder={language === "vi" ? "Mã môn (VD: CS101)" : "Subject Code (Ex: CS101)"} 
                        value={newSubjectCode}
                        onChange={e => setNewSubjectCode(e.target.value)}
                        className="w-1/3 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder={language === "vi" ? "Mô tả / Tên môn học" : "Description / Subject Name"} 
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAddSubject(false)} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 rounded-lg">{language === "vi" ? "Hủy" : "Cancel"}</button>
                      <button type="button" onClick={handleCreateSubject} disabled={isAddingSubject} className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50">
                        {isAddingSubject ? (language === "vi" ? "Đang thêm..." : "Adding...") : (language === "vi" ? "Lưu môn học" : "Save subject")}
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                  {subjects.filter(s => s.subject_name?.toLowerCase().includes(subjectSearch.toLowerCase()) || s.subject_code?.toLowerCase().includes(subjectSearch.toLowerCase())).map(s => {
                    const isSelected = formData.subjects.includes(s.subject_code);
                    return (
                      <label key={s.subject_code} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${isSelected ? "bg-violet-50/80 border-violet-200 shadow-sm" : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"}`}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSubject(s.subject_code)}
                          className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate transition-colors ${isSelected ? "font-bold text-violet-900" : "font-semibold text-slate-800"}`}>{s.subject_name}</p>
                          <p className={`text-xs font-mono transition-colors ${isSelected ? "text-violet-600 font-semibold" : "text-slate-400"}`}>{s.subject_code}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">{language === "vi" ? "Hủy" : "Cancel"}</button>
              <button type="submit" className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95">
                {editingTopic ? (language === "vi" ? "Lưu thay đổi" : "Save changes") : (language === "vi" ? "Tạo Chủ đề" : "Create Topic")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-500" />
                {language === "vi" ? "Thêm Mã Môn Mới" : "Add New Subject Code"}
              </h2>
              <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleStandaloneCreateSubject} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{language === "vi" ? "Mã môn học" : "Subject Code"}</label>
                <input 
                  type="text" 
                  value={newSubjectCode}
                  onChange={e => setNewSubjectCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm uppercase" 
                  placeholder={language === "vi" ? "VD: PRJ301" : "Ex: PRJ301"} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{language === "vi" ? "Mô tả / Tên môn học" : "Description / Subject Name"}</label>
                <input 
                  type="text" 
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" 
                  placeholder={language === "vi" ? "VD: Lập trình Java Web" : "Ex: Java Web Programming"} 
                />
              </div>
            </form>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">{language === "vi" ? "Hủy" : "Cancel"}</button>
              <button onClick={handleStandaloneCreateSubject} disabled={isAddingSubject} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50">
                {isAddingSubject ? (language === "vi" ? "Đang thêm..." : "Adding...") : (language === "vi" ? "Lưu môn học" : "Save subject")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
