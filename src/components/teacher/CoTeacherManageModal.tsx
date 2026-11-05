'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Trash2,
  LogOut,
  Sparkles,
  RefreshCw,
  Crown,
  Handshake,
} from 'lucide-react';
import api from '@/lib/api-client';
import { ClassCoTeachersData, CoTeacherMember } from '@/lib/types';

interface CoTeacherManageModalProps {
  isOpen: boolean;
  classId: string;
  className: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export const CoTeacherManageModal: React.FC<CoTeacherManageModalProps> = ({
  isOpen,
  classId,
  className,
  onClose,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClassCoTeachersData | null>(null);
  const [selectedInviteTeacherId, setSelectedInviteTeacherId] = useState<string>('');

  const loadData = async () => {
    if (!classId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.teacher.getClassCoTeachers(classId);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '載入共同管理教師資料失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && classId) {
      loadData();
    }
  }, [isOpen, classId]);

  if (!isOpen) return null;

  // 邀請新協同教師
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInviteTeacherId) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.teacher.addCoTeacher(classId, selectedInviteTeacherId);
      if (res.success) {
        setSelectedInviteTeacherId('');
        if (res.data) {
          setData(res.data);
        } else {
          await loadData();
        }
        if (onUpdated) onUpdated();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '邀請失敗');
    } finally {
      setSubmitting(false);
    }
  };

  // 移除協同教師 / 退出共同管理
  const handleRemove = async (teacher: CoTeacherMember) => {
    const isSelf = data?.isCoTeacher && !data?.isOwner;
    const confirmMessage = isSelf
      ? `確定要退出「${className}」的共同管理嗎？退出後您將無法再檢視該班級學生與指派測驗。`
      : `確定要將「${teacher.displayName}」老師從「${className}」的共同管理名單中移除嗎？`;

    if (!confirm(confirmMessage)) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.teacher.removeCoTeacher(classId, teacher.id);
      if (res.success) {
        if (isSelf) {
          alert('您已退出該班級的共同管理。');
          onClose();
          if (onUpdated) onUpdated();
          return;
        }
        if (res.data) {
          setData(res.data);
        } else {
          await loadData();
        }
        if (onUpdated) onUpdated();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '操作失敗');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 頂部 Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>班級共同管理與協同教學</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                  {className}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                邀請科任老師、閱推老師一起出題、指派試卷、複閱改分與追蹤學生思維雷達
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs font-semibold">正在讀取共同管理成員名冊...</p>
            </div>
          ) : data ? (
            <>
              {/* 1. 主責導師資訊 */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-900">
                        {data.owner.displayName}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900">
                        👑 班級主責導師 (建立者)
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 mt-0.5">
                      帳號：{data.owner.username} {data.owner.school ? `• 學校：${data.owner.school}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full">
                  擁有最高管理權限
                </span>
              </div>

              {/* 2. 目前協同管理教師清單 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>共同管理教師 ({data.coTeachers.length} 位)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    可共同閱卷、派卷與檢視能力雷達
                  </span>
                </div>

                {data.coTeachers.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center space-y-1 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-600">目前尚無其他共同管理老師</p>
                    <p className="text-[11px] text-slate-400">
                      {data.isOwner
                        ? '您可以從下方邀請科任老師、閱推老師一起加入本班共同管理。'
                        : '本班級由主責導師獨立管理中。'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.coTeachers.map((ct) => (
                      <div
                        key={ct.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {ct.displayName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {ct.displayName} 老師
                              </span>
                              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                                協同教學
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              帳號：{ct.username} {ct.school ? `• ${ct.school}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* 操作按鈕 */}
                        <div>
                          {data.isOwner ? (
                            <button
                              onClick={() => handleRemove(ct)}
                              disabled={submitting}
                              className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-xl font-bold transition inline-flex items-center gap-1 border border-transparent hover:border-rose-100 disabled:opacity-50"
                              title="移除此協同教師"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>移除協同</span>
                            </button>
                          ) : ct.id === data.owner.id ? null : (
                            <span className="text-xs text-slate-400 font-medium">協同成員</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. 邀請全校其他老師加入共同管理 (限主責導師或管理員) */}
              {data.isOwner && (
                <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-950 font-bold text-xs">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>邀請全校其他老師加入共同管理</span>
                  </div>

                  <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedInviteTeacherId}
                      onChange={(e) => setSelectedInviteTeacherId(e.target.value)}
                      className="flex-1 text-xs sm:text-sm bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="">-- 請選擇欲邀請之教師 --</option>
                      {data.availableTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.displayName} 老師 ({t.username}) {t.school ? `- ${t.school}` : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={!selectedInviteTeacherId || submitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{submitting ? '邀請中...' : '加入共同管理'}</span>
                    </button>
                  </form>

                  {data.availableTeachers.length === 0 && (
                    <p className="text-[11px] text-slate-500">
                      （全校所有已審核的合格教師皆已在該班共同管理名單中）
                    </p>
                  )}
                </div>
              )}

              {/* 若當前使用者是受邀協同教師，提供退出按鈕 */}
              {!data.isOwner && data.isCoTeacher && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    您目前是此班級的受邀協同教師。
                  </span>
                  <button
                    onClick={() =>
                      handleRemove({
                        id: '',
                        displayName: '',
                        username: '',
                        role: 'teacher',
                      })
                    }
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3.5 py-2 rounded-xl transition border border-rose-200/60"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>退出共同管理</span>
                  </button>
                </div>
              )}

              {/* 4. 權限說明卡片 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>共同管理權限說明：</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-500">
                  <li>
                    <strong className="text-slate-700">協同教學權限</strong>：受邀老師可在自己的教師後台存取本班級、檢視學生名冊、指派題庫試卷、進行線上複閱改分，並檢視全班與學生歷程能力雷達。
                  </li>
                  <li>
                    <strong className="text-slate-700">安全隔離保護</strong>：協同教師無法刪除班級，也無法移除主責導師；隨時可自行選擇「退出共同管理」。
                  </li>
                </ul>
              </div>
            </>
          ) : null}
        </div>

        {/* 底部 Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-sm"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
