<template>
  <div>
    <h1>仪表盘</h1>
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card title="销售订单" :bordered="false">
          <p>暂无数据</p>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card title="采购订单" :bordered="false">
          <p>暂无数据</p>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card title="客户" :bordered="false">
          <p>暂无数据</p>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card title="供应商" :bordered="false">
          <p>暂无数据</p>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
</script>
