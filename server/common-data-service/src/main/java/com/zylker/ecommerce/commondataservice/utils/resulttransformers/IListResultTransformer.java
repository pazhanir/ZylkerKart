package com.zylker.ecommerce.commondataservice.utils.resulttransformers;

import org.hibernate.transform.ResultTransformer;

import java.util.List;

@FunctionalInterface
@SuppressWarnings("rawtypes")
public interface IListResultTransformer extends ResultTransformer {

    /**
     * Default implementation returning the tuples list as-is.
     *
     * @param tuples tuples list
     * @return tuples list
     */
    @Override
    default List transformList(List tuples) {
        return tuples;
    }
}