import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

const activityData = [
  { day: "Mon", tasks: 120 },
  { day: "Tue", tasks: 180 },
  { day: "Wed", tasks: 150 },
  { day: "Thu", tasks: 230 },
  { day: "Fri", tasks: 210 },
  { day: "Sat", tasks: 280 },
  { day: "Sun", tasks: 320 },
]

const tokenData = [
  { day: "Mon", tokens: 1.2 },
  { day: "Tue", tokens: 1.8 },
  { day: "Wed", tokens: 1.5 },
  { day: "Thu", tokens: 2.4 },
  { day: "Fri", tokens: 2.1 },
  { day: "Sat", tokens: 2.8 },
  { day: "Sun", tokens: 3.2 },
]

function DashboardCharts() {
  return (
    <div className="charts-grid">

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Agent Activity</h3>
            <p>Tasks completed in the last 7 days</p>
          </div>

          <select defaultValue="7">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />

              <Line
                type="monotone"
                dataKey="tasks"
                stroke="var(--chart-1)"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Token Usage</h3>
            <p>Token consumption in millions</p>
          </div>

          <select defaultValue="7">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tokenData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />

              <Bar
                dataKey="tokens"
                fill="var(--chart-1)"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}

export default DashboardCharts