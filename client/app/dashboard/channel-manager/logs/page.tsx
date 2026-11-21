'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { channelManagerApi } from '@/lib/api';
import {
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  RotateCw,
  X,
  Code,
  Clock,
} from 'lucide-react';

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [payloadModalOpen, setPayloadModalOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await channelManagerApi.getLogs(100);
      setLogs(data || []);
    } catch (err: any) {
      alert('Failed to load sync logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayload = (log: any) => {
    setSelectedLog(log);
    setPayloadModalOpen(true);
  };

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await channelManagerApi.retryJob(jobId);
      await loadLogs();
      alert('Retry job initiated successfully.');
    } catch (err: any) {
      alert('Retry failed: ' + err.message);
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Success
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Warning
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/channel-manager" className="hover:text-indigo-600">
                Channel Manager
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-700">Audit Logs</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Synchronization Audit Logs
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit stream of all outbound availability/rate pushes, inbound webhooks, HTTP latency, and payload traces.
            </p>
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stream
          </button>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Operation</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">HTTP Code</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Diagnostics / Error</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No synchronization events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{log.channelCode}</td>
                      <td className="p-3 font-semibold text-slate-700">
                        {log.operation.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3">{getStatusBadge(log.status)}</td>
                      <td className="p-3 font-mono">
                        {log.httpStatusCode ? (
                          <span
                            className={`font-bold ${
                              log.httpStatusCode < 300
                                ? 'text-emerald-700'
                                : log.httpStatusCode < 500
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            HTTP {log.httpStatusCode}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{log.durationMs}ms</td>
                      <td className="p-3 max-w-xs truncate text-slate-600">
                        {log.errorMessage ? (
                          <span className="text-rose-600 font-semibold">{log.errorMessage}</span>
                        ) : (
                          <span className="text-slate-400">Normal execution</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleViewPayload(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Payload
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payload Inspector Modal */}
        {payloadModalOpen && selectedLog && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Payload Inspector: {selectedLog.channelCode} – {selectedLog.operation}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {new Date(selectedLog.createdAt).toISOString()} • {selectedLog.durationMs}ms latency
                  </div>
                </div>
                <button
                  onClick={() => setPayloadModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Request Payload */}
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-indigo-600" />
                    Request Payload
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">
                    {selectedLog.requestPayload || '// No outbound payload attached'}
                  </pre>
                </div>

                {/* Response Payload */}
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Response Payload / Status
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">
                    {selectedLog.responsePayload || '// No response payload attached'}
                  </pre>
                </div>

                {/* Error Trace if any */}
                {selectedLog.errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                    <div className="font-bold mb-1">Error Diagnostics:</div>
                    <div>{selectedLog.errorMessage}</div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setPayloadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
