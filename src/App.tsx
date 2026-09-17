import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ContentCopy from "@mui/icons-material/ContentCopy";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Flag from "@mui/icons-material/Flag";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import UploadFile from "@mui/icons-material/UploadFile";
import { guessMapping } from "./lib/mapColumns";
import { parseCsvText, parseWorkbook } from "./lib/parse";
import { packWeek, sortCandidates, syncBackMarkdown, weekMarkdown } from "./lib/packWeek";
import { isClosed } from "./lib/classify";
import {
  buildItems,
  clearState,
  isMine,
  loadState,
  savePrefs,
  saveSnapshot,
  uniqueOwnersFromRows,
  type SavedPrefs,
} from "./lib/storage";
import {
  PRIORITY_LABEL,
  SOURCE_LABEL,
  TYPE_LABEL,
  WEEK_PROGRESS_LABEL,
  type ColumnMapping,
  type ColumnRole,
  type ItemType,
  type PersonalPriority,
  type SnapshotRow,
  type SourceKind,
  type WeekProgress,
  type WorkItem,
} from "./lib/types";

const STEPS = [
  { id: "import", label: "导入" },
  { id: "map", label: "映射" },
  { id: "pool", label: "需求池" },
  { id: "week", label: "本周" },
] as const;

type StepId = (typeof STEPS)[number]["id"];
type KindFilter = "all" | "design" | "high" | "defect" | "hardware";
type StatusFilter = "all" | "待受理" | "待排期" | "待澄清" | "已排期";

const PAGE_SIZE = 12;

const ROLES: Array<{ role: ColumnRole; label: string; required?: boolean }> = [
  { role: "title", label: "标题", required: true },
  { role: "titleAlt", label: "标题备选" },
  { role: "owner", label: "产品负责人", required: true },
  { role: "submitter", label: "提交人" },
  { role: "background", label: "背景" },
  { role: "backgroundAlt", label: "背景备选" },
  { role: "status", label: "公司状态" },
  { role: "bugId", label: "缺陷编号" },
  { role: "companyClass", label: "A/B/C/D" },
  { role: "companyClassAlt", label: "分类备选" },
  { role: "priority", label: "源优先级" },
  { role: "productLine", label: "产品线" },
  { role: "source", label: "来源" },
  { role: "period", label: "规划期" },
];

const KIND_CHIPS: Array<{ id: KindFilter; label: string }> = [
  { id: "all", label: "全部类型" },
  { id: "design", label: "待设计" },
  { id: "high", label: "高优先" },
  { id: "defect", label: "缺陷" },
  { id: "hardware", label: "硬件固件" },
];

const STATUS_CHIPS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "全部状态" },
  { id: "待受理", label: "待受理" },
  { id: "待排期", label: "待排期" },
  { id: "待澄清", label: "待澄清" },
  { id: "已排期", label: "已排期" },
];

const compactSelectSx = {
  minWidth: 0,
  fontSize: 12,
  "& .MuiSelect-select": {
    py: 0.4,
    px: 0.75,
    fontSize: 12,
    lineHeight: 1.35,
    overflow: "visible",
  },
};

const compactHoursSx = {
  minWidth: 0,
  "& .MuiOutlinedInput-root": { fontSize: 12 },
  "& .MuiOutlinedInput-input": {
    py: 0.4,
    px: 0.5,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 1.35,
  },
  "& input[type=number]": { MozAppearance: "textfield" },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
    {
      WebkitAppearance: "none",
      margin: 0,
    },
};

export default function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<StepId>("import");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [owner, setOwner] = useState("");
  const [includeSubmitter, setIncludeSubmitter] = useState(false);
  const [capacity, setCapacity] = useState(20);
  const [overrides, setOverrides] = useState<SavedPrefs["overrides"]>({});
  const [copied, setCopied] = useState<"week" | "sync" | "">("");
  const [error, setError] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<WorkItem | null>(null);

  useEffect(() => {
    const saved = loadState();
    if (!saved) return;
    setHeaders(saved.headers);
    setRows(saved.rows);
    setMapping(saved.mapping);
    setOwner(saved.owner);
    setIncludeSubmitter(saved.includeSubmitter);
    setCapacity(saved.capacity);
    setOverrides(saved.overrides);
    setStep(saved.rows.length ? "pool" : "import");
  }, []);

  useEffect(() => {
    if (!rows.length) return;
    const timer = window.setTimeout(() => {
      savePrefs({ mapping, owner, includeSubmitter, capacity, overrides });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [mapping, owner, includeSubmitter, capacity, overrides, rows.length]);

  const items = useMemo(
    () => buildItems(rows, mapping, overrides),
    [rows, mapping, overrides],
  );
  const owners = useMemo(
    () => uniqueOwnersFromRows(rows, mapping.owner),
    [rows, mapping.owner],
  );
  const mine = useMemo(
    () => items.filter((item) => isMine(item, owner, includeSubmitter)),
    [items, owner, includeSubmitter],
  );
  const filteredMine = useMemo(() => {
    const open = mine.filter((item) => !isClosed(item.status));
    let list = mine;
    if (kindFilter === "design") list = open.filter((item) => item.type === "software");
    else if (kindFilter === "high") list = open.filter((item) => item.personalPriority === "high");
    else if (kindFilter === "defect") list = mine.filter((item) => item.type === "defect");
    else if (kindFilter === "hardware") list = mine.filter((item) => item.type === "hardware");
    if (statusFilter !== "all") {
      list = list.filter((item) => item.status === statusFilter);
    }
    return sortCandidates(list);
  }, [mine, kindFilter, statusFilter]);

  const packed = useMemo(
    () => packWeek(mine.filter((item) => !isClosed(item.status)), capacity),
    [mine, capacity],
  );
  const packedHours = packed.reduce((sum, item) => sum + item.hours, 0);
  const tableRows = step === "week" ? packed : filteredMine;
  const pagedRows = tableRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const progressCounts = useMemo(() => {
    const counts: Record<WeekProgress, number> = {
      未开始: 0,
      进行中: 0,
      已完成: 0,
      阻塞: 0,
    };
    packed.forEach((item) => {
      counts[item.weekProgress] += 1;
    });
    return counts;
  }, [packed]);

  useEffect(() => {
    setPage(0);
  }, [kindFilter, statusFilter, owner, step, includeSubmitter]);

  async function loadSample() {
    setError("");
    const response = await fetch("./samples/esl-backlog.sample.csv");
    const text = await response.text();
    const parsed = parseCsvText(text);
    applySnapshot(parsed.headers, parsed.rows);
  }

  async function onFile(file: File) {
    setError("");
    try {
      const buffer = await file.arrayBuffer();
      const parsed = file.name.toLowerCase().endsWith(".csv")
        ? parseCsvText(new TextDecoder().decode(buffer))
        : parseWorkbook(buffer);
      if (!parsed.headers.length) {
        setError("没有读到表头。请导出第一张表。");
        return;
      }
      applySnapshot(parsed.headers, parsed.rows);
    } catch {
      setError("文件解析失败。请用钉钉多维表导出的 xlsx 或 csv。");
    }
  }

  function applySnapshot(nextHeaders: string[], nextRows: SnapshotRow[]) {
    const guessed = guessMapping(nextHeaders);
    saveSnapshot(nextHeaders, nextRows);
    setHeaders(nextHeaders);
    setRows(nextRows);
    setMapping(guessed);
    setOverrides({});
    const guessedOwner = uniqueOwnersFromRows(nextRows, guessed.owner)[0] ?? "";
    if (guessedOwner) setOwner(guessedOwner);
    setStep("map");
  }

  function patchItem(id: string, patch: Partial<SavedPrefs["overrides"][string]>) {
    setOverrides((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function copyWeek() {
    await navigator.clipboard.writeText(weekMarkdown(packed, owner, capacity));
    setCopied("week");
    window.setTimeout(() => setCopied(""), 1600);
  }

  async function copySync() {
    await navigator.clipboard.writeText(syncBackMarkdown(packed));
    setCopied("sync");
    window.setTimeout(() => setCopied(""), 1600);
  }

  const hasData = rows.length > 0;
  const showOwner = hasData && (step === "pool" || step === "week");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky">
        <Toolbar sx={{ minHeight: 64, gap: 1.5, flexWrap: "wrap", py: 0.75 }}>
          <Box sx={{ flex: 1, minWidth: 160 }}>
            <Typography variant="h6" component="h1">
              个人需求舱
            </Typography>
            <Typography variant="caption" color="text.secondary">
              把共享任务池收成你这周要设计的清单
            </Typography>
          </Box>
          {showOwner ? (
            <>
              <FormControl size="small" sx={{ minWidth: 168, bgcolor: "background.paper", borderRadius: 1 }}>
                <InputLabel>产品负责人</InputLabel>
                <Select
                  label="产品负责人"
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                >
                  {owners.map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                sx={{ color: "inherit", mr: 0, whiteSpace: "nowrap" }}
                control={
                  <Checkbox
                    size="small"
                    color="default"
                    checked={includeSubmitter}
                    onChange={(event) => setIncludeSubmitter(event.target.checked)}
                  />
                }
                label={<Typography variant="body2">含我提交</Typography>}
              />
            </>
          ) : null}
          <Button
            color="inherit"
            size="small"
            startIcon={<DeleteOutline />}
            onClick={() => {
              clearState();
              setRows([]);
              setHeaders([]);
              setOverrides({});
              setStep("import");
            }}
          >
            清空
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} disableGutters sx={{ py: 1.5, px: { xs: 1, md: 1.5 } }}>
        <Paper
          sx={{
            mb: 1.5,
            px: 1,
            borderRadius: 999,
            bgcolor: "#e9eef6",
            width: "fit-content",
            maxWidth: "100%",
          }}
        >
          <Tabs
            value={step}
            onChange={(_event, value: StepId) => setStep(value)}
            variant="scrollable"
            scrollButtons={false}
            TabIndicatorProps={{ style: { display: "none" } }}
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                minHeight: 44,
                minWidth: 88,
                borderRadius: 999,
                mx: 0.25,
                color: "text.secondary",
              },
              "& .Mui-selected": {
                bgcolor: "#fff",
                color: "text.primary",
                boxShadow: "0 1px 2px rgba(31,31,31,0.12)",
              },
            }}
          >
            {STEPS.map((item) => (
              <Tab
                key={item.id}
                value={item.id}
                label={item.label}
                disabled={!hasData && item.id !== "import"}
              />
            ))}
          </Tabs>
        </Paper>

        {step === "import" && (
          <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
            <Typography variant="h5" gutterBottom>
              导入任务池
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 560, lineHeight: 1.7 }}>
              可先加载样例熟悉流程，或直接导入钉钉导出的 Excel。文件只留在这台电脑，不会上传。
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" size="large" onClick={() => void loadSample()}>
                加载样例
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<UploadFile />}
                onClick={() => fileRef.current?.click()}
              >
                上传表格
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onFile(file);
                  event.target.value = "";
                }}
              />
            </Stack>
            {error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            ) : null}
            {hasData ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                已载入 {rows.length} 条
              </Typography>
            ) : null}
          </Paper>
        )}

        {step === "map" && (
          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
            <Typography variant="h5" gutterBottom>
              对上列名
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              标题和产品负责人必填。映射会记住，下次同一张表不用重配。
            </Typography>
            <Grid container spacing={2}>
              {ROLES.map((item) => (
                <Grid key={item.role} item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>
                      {item.label}
                      {item.required ? " *" : ""}
                    </InputLabel>
                    <Select
                      label={`${item.label}${item.required ? " *" : ""}`}
                      value={mapping[item.role] ?? ""}
                      onChange={(event) =>
                        setMapping((current) => ({
                          ...current,
                          [item.role]: event.target.value || undefined,
                        }))
                      }
                    >
                      <MenuItem value="">不使用</MenuItem>
                      {headers.map((header) => (
                        <MenuItem key={header} value={header}>
                          {header}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
            </Grid>
            <Button variant="contained" sx={{ mt: 3 }} onClick={() => setStep("pool")}>
              查看需求池
            </Button>
          </Paper>
        )}

        {(step === "pool" || step === "week") && (
          <Grid container spacing={1.25} alignItems="flex-start">
            <Grid item xs={12} lg={10}>
              <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "none" }}>
                <Box sx={{ px: 1.5, pt: 1.25, pb: 0.75 }}>
                  {step === "pool" ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ mb: 1, overflowX: "auto", pb: 0.5, alignItems: "center" }}
                    >
                      {KIND_CHIPS.map((chip) => (
                        <Chip
                          key={chip.id}
                          size="small"
                          label={chip.label}
                          clickable
                          color={kindFilter === chip.id ? "primary" : "default"}
                          variant={kindFilter === chip.id ? "filled" : "outlined"}
                          onClick={() => setKindFilter(chip.id)}
                          sx={{ flexShrink: 0 }}
                        />
                      ))}
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                      {STATUS_CHIPS.map((chip) => (
                        <Chip
                          key={chip.id}
                          size="small"
                          label={chip.label}
                          clickable
                          color={statusFilter === chip.id ? "primary" : "default"}
                          variant={statusFilter === chip.id ? "filled" : "outlined"}
                          onClick={() => setStatusFilter(chip.id)}
                          sx={{ flexShrink: 0 }}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <TextField
                        size="small"
                        type="number"
                        label="本周可用小时"
                        value={capacity}
                        onChange={(event) => setCapacity(Number(event.target.value) || 0)}
                        sx={{ width: 140 }}
                        slotProps={{ htmlInput: { min: 1 } }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        清单状态可改、会记住。复制回写摘要后去任务池批量改原始状态。
                      </Typography>
                    </Stack>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {owner || "未选负责人"} · {step === "week" ? `${packed.length} 条本周` : `${filteredMine.length} 条符合筛选`}
                    {step === "pool" ? ` · 本周建议 ${packed.length} 条` : ""}
                  </Typography>
                </Box>
                <TableContainer>
                  <Table
                    size="small"
                    sx={{
                      tableLayout: "fixed",
                      "& .MuiTableCell-root": {
                        px: 1,
                        py: 0.6,
                        fontSize: 12,
                      },
                      "& .MuiTableCell-head": { fontSize: 12, px: 1, py: 0.75 },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: step === "week" ? "30%" : "36%" }}>需求</TableCell>
                        <TableCell sx={{ width: "14%" }}>来源</TableCell>
                        <TableCell sx={{ width: "12%" }}>类型</TableCell>
                        <TableCell sx={{ width: "8%" }}>优先级</TableCell>
                        <TableCell sx={{ width: 72 }}>小时</TableCell>
                        <TableCell sx={{ width: step === "week" ? "12%" : "14%" }}>
                          {step === "week" ? "清单状态" : "任务池状态"}
                        </TableCell>
                        {step === "week" ? (
                          <TableCell align="center" sx={{ width: 52, px: 0.25 }}>
                            钉住
                          </TableCell>
                        ) : null}
                        <TableCell align="center" sx={{ width: 56, px: 0.25 }}>
                          详情
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedRows.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                width: "fit-content",
                                maxWidth: "100%",
                                fontSize: 11,
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                userSelect: "all",
                                letterSpacing: 0.2,
                              }}
                            >
                              {item.bugId || "无编号"}
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                              {item.pinned ? (
                                <Flag fontSize="small" sx={{ color: "#c62828", flexShrink: 0 }} />
                              ) : null}
                              <Tooltip title={item.title} placement="top-start">
                                <Typography
                                  variant="body2"
                                  noWrap
                                  sx={{ fontSize: 13, minWidth: 0, flex: 1 }}
                                >
                                  {item.title}
                                </Typography>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              fullWidth
                              value={item.sourceKind}
                              sx={compactSelectSx}
                              onChange={(event) =>
                                patchItem(item.id, {
                                  sourceKind: event.target.value as SourceKind,
                                })
                              }
                            >
                              {(Object.keys(SOURCE_LABEL) as SourceKind[]).map((kind) => (
                                <MenuItem key={kind} value={kind} sx={{ fontSize: 13 }}>
                                  {SOURCE_LABEL[kind]}
                                </MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              fullWidth
                              value={item.type}
                              sx={compactSelectSx}
                              onChange={(event) =>
                                patchItem(item.id, { type: event.target.value as ItemType })
                              }
                            >
                              {(Object.keys(TYPE_LABEL) as ItemType[]).map((type) => (
                                <MenuItem key={type} value={type} sx={{ fontSize: 13 }}>
                                  {TYPE_LABEL[type]}
                                </MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              fullWidth
                              value={item.personalPriority}
                              sx={compactSelectSx}
                              onChange={(event) =>
                                patchItem(item.id, {
                                  personalPriority: event.target.value as PersonalPriority,
                                })
                              }
                            >
                              {(Object.keys(PRIORITY_LABEL) as PersonalPriority[]).map((p) => (
                                <MenuItem key={p} value={p} sx={{ fontSize: 13 }}>
                                  {PRIORITY_LABEL[p]}
                                </MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={item.hours}
                              sx={compactHoursSx}
                              onChange={(event) =>
                                patchItem(item.id, { hours: Number(event.target.value) || 1 })
                              }
                              slotProps={{ htmlInput: { min: 1 } }}
                            />
                          </TableCell>
                          <TableCell>
                            {step === "week" ? (
                              <Select
                                size="small"
                                fullWidth
                                value={item.weekProgress}
                                sx={compactSelectSx}
                                onChange={(event) =>
                                  patchItem(item.id, {
                                    weekProgress: event.target.value as WeekProgress,
                                  })
                                }
                              >
                                {WEEK_PROGRESS_LABEL.map((status) => (
                                  <MenuItem key={status} value={status} sx={{ fontSize: 13 }}>
                                    {status}
                                  </MenuItem>
                                ))}
                              </Select>
                            ) : (
                              <Typography variant="body2" noWrap sx={{ fontSize: 12 }}>
                                {item.status || "—"}
                              </Typography>
                            )}
                          </TableCell>
                          {step === "week" ? (
                            <TableCell align="center" sx={{ width: 52, px: 0.25 }}>
                              <Checkbox
                                checked={item.pinned}
                                onChange={(event) =>
                                  patchItem(item.id, { pinned: event.target.checked })
                                }
                                icon={<Flag fontSize="small" color="disabled" />}
                                checkedIcon={<Flag fontSize="small" sx={{ color: "#c62828" }} />}
                                inputProps={{ "aria-label": "钉住" }}
                                sx={{ p: 0.25 }}
                              />
                            </TableCell>
                          ) : null}
                          <TableCell align="center" sx={{ width: 56, px: 0.25 }}>
                            <Tooltip title="查看原始详情">
                              <IconButton size="small" onClick={() => setDetail(item)} aria-label="查看原始详情">
                                <InfoOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={tableRows.length}
                  page={page}
                  onPageChange={(_event, next) => setPage(next)}
                  rowsPerPage={PAGE_SIZE}
                  rowsPerPageOptions={[PAGE_SIZE]}
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} lg={2}>
              <Card sx={{ borderRadius: 2, position: "sticky", top: 72, border: "none" }}>
                <CardContent sx={{ px: 1.5, py: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {owner || "未选负责人"}的本周
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {capacity}h 容量 · 已放入 {packedHours}h
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    已完成 {progressCounts.已完成} · 进行中 {progressCounts.进行中} · 阻塞{" "}
                    {progressCounts.阻塞} · 未开始 {progressCounts.未开始}
                  </Typography>
                  <Stack spacing={1.25} sx={{ mb: 2, maxHeight: 320, overflow: "auto" }}>
                    {packed.map((item, index) => (
                      <Box key={item.id}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {item.pinned ? <Flag sx={{ fontSize: 14, color: "#c62828" }} /> : null}
                          <Typography variant="caption" color="text.secondary">
                            {index + 1}. {item.weekProgress} · {item.hours}h
                          </Typography>
                        </Stack>
                        <Tooltip title={item.title}>
                          <Typography variant="body2" noWrap>
                            {item.title}
                          </Typography>
                        </Tooltip>
                      </Box>
                    ))}
                  </Stack>
                  <Stack spacing={1}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ContentCopy />}
                      onClick={() => void copyWeek()}
                    >
                      {copied === "week" ? "已复制" : "复制本周清单"}
                    </Button>
                    <Button fullWidth variant="outlined" onClick={() => void copySync()}>
                      {copied === "sync" ? "已复制回写摘要" : "复制待回写任务池"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>

      <Dialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { maxHeight: "86vh" } }}
      >
        <DialogTitle component="div" sx={{ pr: 3 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
            {detail?.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            sx={{
              mt: 0.75,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              userSelect: "all",
              width: "fit-content",
            }}
          >
            {detail?.bugId || "无编号"}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 0, py: 0 }}>
          {detail
            ? Object.entries(detail.raw).map(([key, value]) => (
                <Box
                  key={key}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(168px, 34%) 1fr",
                    columnGap: 2,
                    px: 3,
                    py: 1.25,
                    alignItems: "start",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-of-type": { borderBottom: "none" },
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ pt: "2px", lineHeight: 1.5, wordBreak: "break-word" }}
                  >
                    {key}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", userSelect: "text" }}
                  >
                    {value || "—"}
                  </Typography>
                </Box>
              ))
            : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
